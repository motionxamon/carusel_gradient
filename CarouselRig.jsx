/*
CarouselRig.jsx
Minimal After Effects ScriptUI panel for arranging selected layers into a 2D/3D carousel.
*/

(function carouselRig(thisObj) {
    var SCRIPT_NAME = "Carousel Rig";

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        pal.orientation = "column";
        pal.alignChildren = ["fill", "top"];
        pal.spacing = 8;
        pal.margins = 10;

        var radiusGroup = pal.add("group");
        radiusGroup.orientation = "row";
        radiusGroup.alignChildren = ["left", "center"];
        radiusGroup.add("statictext", undefined, "Radius");
        var radiusInput = radiusGroup.add("edittext", undefined, "auto");
        radiusInput.characters = 8;

        var offsetGroup = pal.add("group");
        offsetGroup.orientation = "row";
        offsetGroup.alignChildren = ["left", "center"];
        offsetGroup.add("statictext", undefined, "Rotation");
        var rotationInput = offsetGroup.add("edittext", undefined, "0");
        rotationInput.characters = 8;

        var spacingGroup = pal.add("group");
        spacingGroup.orientation = "row";
        spacingGroup.alignChildren = ["left", "center"];
        spacingGroup.add("statictext", undefined, "Offset");
        var offsetInput = spacingGroup.add("edittext", undefined, "0");
        offsetInput.characters = 8;

        var options = pal.add("group");
        options.orientation = "row";
        var make3DCheck = options.add("checkbox", undefined, "3D");
        make3DCheck.value = true;
        var faceCameraCheck = options.add("checkbox", undefined, "Face Camera");
        faceCameraCheck.value = true;
        var gradientScaleCheck = options.add("checkbox", undefined, "Gradient Scale");
        gradientScaleCheck.value = false;

        var createBtn = pal.add("button", undefined, "Create Carousel");
        createBtn.onClick = function () {
            app.beginUndoGroup(SCRIPT_NAME);
            try {
                var comp = activeComp();
                createCarousel({
                    comp: comp,
                    radius: autoNumber(radiusInput.text, defaultRadius(comp)),
                    rotation: numberValue(rotationInput.text, 0),
                    offset: numberValue(offsetInput.text, 0),
                    make3D: make3DCheck.value,
                    faceCamera: faceCameraCheck.value,
                    gradientScale: gradientScaleCheck.value
                });
            } catch (err) {
                alert(err.toString());
            } finally {
                app.endUndoGroup();
            }
        };

        pal.layout.layout(true);
        pal.layout.resize();
        pal.onResizing = pal.onResize = function () { this.layout.resize(); };
        return pal;
    }

    function numberValue(text, fallback) {
        var value = parseFloat(text);
        return isNaN(value) ? fallback : value;
    }

    function autoNumber(text, fallback) {
        if (!text || String(text).toLowerCase() === "auto") {
            return fallback;
        }
        return numberValue(text, fallback);
    }

    function defaultRadius(comp) {
        return Math.round(Math.min(comp.width, comp.height) * 0.28);
    }

    function activeComp() {
        var item = app.project.activeItem;
        if (!(item instanceof CompItem)) {
            throw new Error("Open a composition first.");
        }
        return item;
    }

    function selectedCarouselLayers(comp) {
        var out = [];
        var selected = comp.selectedLayers;
        for (var i = 0; i < selected.length; i++) {
            var layer = selected[i];
            if (isCarouselLayer(layer)) {
                out.push(layer);
            }
        }
        if (out.length < 1) {
            throw new Error("Select at least one layer.");
        }
        return out;
    }

    function isCarouselLayer(layer) {
        if (!layer) {
            return false;
        }
        if (layer.matchName === "ADBE Camera Layer" || layer.matchName === "ADBE Light Layer") {
            return false;
        }
        if (!layer.property("ADBE Transform Group") || !layer.property("ADBE Effect Parade")) {
            return false;
        }
        if (layer.nullLayer) {
            return false;
        }
        if (typeof CameraLayer !== "undefined" && layer instanceof CameraLayer) {
            return false;
        }
        if (typeof LightLayer !== "undefined" && layer instanceof LightLayer) {
            return false;
        }
        return true;
    }

    function uniqueName(comp, base) {
        var name = base;
        var n = 2;
        while (layerByName(comp, name) !== null) {
            name = base + " " + n;
            n++;
        }
        return name;
    }

    function layerByName(comp, name) {
        try {
            return comp.layer(name);
        } catch (err) {
            return null;
        }
    }

    function addSlider(layer, name, value) {
        var fx = layer.property("ADBE Effect Parade");
        if (!fx) {
            throw new Error("Layer cannot receive controls: " + layer.name);
        }
        var prop = fx.addProperty("ADBE Slider Control");
        prop.name = name;
        prop.property(1).setValue(value);
        return prop;
    }

    function setOrAddSlider(layer, name, value) {
        var fx = layer.property("ADBE Effect Parade");
        if (!fx) {
            throw new Error("Layer cannot receive controls: " + layer.name);
        }
        var prop = fx.property(name);
        if (!prop) {
            prop = fx.addProperty("ADBE Slider Control");
            prop.name = name;
        }
        prop.property(1).setValue(value);
        return prop;
    }

    function createController(comp, opts, count) {
        var ctrl = comp.layers.addNull();
        ctrl.name = uniqueName(comp, "Carousel CTRL");
        ctrl.threeDLayer = opts.make3D;
        ctrl.label = 9;

        var position = opts.make3D
            ? [comp.width / 2, comp.height / 2, 0]
            : [comp.width / 2, comp.height / 2];
        ctrl.property("ADBE Transform Group").property("ADBE Position").setValue(position);

        addSlider(ctrl, "Radius", opts.radius);
        addSlider(ctrl, "Rotation", opts.rotation);
        addSlider(ctrl, "Offset", opts.offset);
        if (opts.gradientScale) {
            addSlider(ctrl, "Min Scale", 55);
            addSlider(ctrl, "Max Scale", 115);
        }
        return ctrl;
    }

    function createGradientLayer(comp) {
        var name = "Carousel Gradient Scale";
        var layer = layerByName(comp, name);
        if (layer && layer.matchName !== "ADBE Camera Layer" && layer.matchName !== "ADBE Light Layer") {
            ensureGradientLayerSetup(layer, comp);
            return layer;
        }

        layer = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
        ensureGradientLayerSetup(layer, comp);
        layer.moveToEnd();
        return layer;
    }

    function ensureGradientLayerSetup(layer, comp) {
        layer.label = 11;
        layer.guideLayer = true;
        layer.shy = true;

        var fx = layer.property("ADBE Effect Parade");
        if (fx) {
            var ramp = fx.property("Carousel Gradient");
            if (!ramp) {
                ramp = fx.addProperty("ADBE Ramp");
            }
            if (ramp) {
                ramp.name = "Carousel Gradient";
                setRampDefaults(ramp, comp);
            }
        }
        layer.enabled = false;
    }

    function setRampDefaults(ramp, comp) {
        try {
            ramp.property(1).setValue([comp.width / 2, 0]);
            ramp.property(2).setValue([1, 1, 1]);
            ramp.property(3).setValue([comp.width / 2, comp.height]);
            ramp.property(4).setValue([0, 0, 0]);
        } catch (err) {}
    }

    function createCamera(comp) {
        var camera = layerByName(comp, "Carousel Camera");
        if (camera && camera.matchName === "ADBE Camera Layer") {
            return camera;
        }

        camera = comp.layers.addCamera("Carousel Camera", [comp.width / 2, comp.height / 2]);
        var distance = Math.max(comp.width, comp.height) * 1.5;
        var transform = camera.property("ADBE Transform Group");
        var position = transform ? transform.property("ADBE Position") : null;
        var poi = transform ? transform.property("ADBE Point of Interest") : null;
        if (position) {
            position.setValue([comp.width / 2, comp.height / 2, -distance]);
        }
        if (poi) {
            poi.setValue([comp.width / 2, comp.height / 2, 0]);
        }
        return camera;
    }

    function createCarousel(opts) {
        var comp = opts.comp;
        var layers = selectedCarouselLayers(comp);
        var ctrl = createController(comp, opts, layers.length);
        var gradientLayer = opts.gradientScale ? createGradientLayer(comp) : null;

        if (opts.make3D) {
            createCamera(comp);
        }

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            layer.threeDLayer = opts.make3D;
            setOrAddSlider(layer, "Carousel Index", i + 1);
            setOrAddSlider(layer, "Carousel Count", layers.length);
            fitLayerToComp(layer, comp, opts.make3D);
            layer.parent = ctrl;
            if (opts.make3D && opts.faceCamera) {
                try {
                    layer.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST;
                } catch (err) {}
            }
            applyExpressions(layer, ctrl.name, opts.make3D);
            if (gradientLayer) {
                applyGradientScaleExpression(layer, ctrl.name, gradientLayer.name);
            }
        }
    }

    function fitLayerToComp(layer, comp, is3D) {
        var sourceRect = null;
        try {
            sourceRect = layer.sourceRectAtTime(comp.time, false);
        } catch (err) {}

        var width = sourceRect && sourceRect.width ? sourceRect.width : layer.width;
        var height = sourceRect && sourceRect.height ? sourceRect.height : layer.height;
        if (!width || !height) {
            return;
        }

        var maxW = comp.width * 0.24;
        var maxH = comp.height * 0.24;
        var fit = Math.min(maxW / width, maxH / height, 1) * 100;
        var transform = layer.property("ADBE Transform Group");
        var scaleProp = transform ? transform.property("ADBE Scale") : null;
        if (!scaleProp) {
            return;
        }
        var scale = scaleProp.value;
        if (is3D) {
            scaleProp.setValue([fit, fit, scale.length > 2 ? fit : 100]);
        } else {
            scaleProp.setValue([fit, fit]);
        }
    }

    function applyExpressions(layer, ctrlName, is3D) {
        var safeCtrlName = ctrlName.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");

        var shared =
            'ctrl=thisComp.layer("' + safeCtrlName + '");\n' +
            'idx=effect("Carousel Index")("Slider")-1;\n' +
            'count=Math.max(1,Math.round(effect("Carousel Count")("Slider")));\n' +
            'rotation=degreesToRadians(ctrl.effect("Rotation")("Slider"));\n' +
            'offset=ctrl.effect("Offset")("Slider")/100;\n' +
            'step=(Math.PI*2/count)*(1-offset);\n' +
            'a=rotation+idx*step;\n';

        var posExpr;
        if (is3D) {
            posExpr = shared +
                'radius=ctrl.effect("Radius")("Slider");\n' +
                '[Math.sin(a)*radius,0,Math.cos(a)*radius];';
        } else {
            posExpr = shared +
                'radius=ctrl.effect("Radius")("Slider");\n' +
                '[Math.sin(a)*radius,Math.cos(a)*radius*0.28];';
        }

        var transform = layer.property("ADBE Transform Group");
        var position = transform ? transform.property("ADBE Position") : null;
        if (!position) {
            throw new Error("Layer has no editable transform: " + layer.name);
        }
        position.expression = posExpr;
    }

    function applyGradientScaleExpression(layer, ctrlName, gradientName) {
        var transform = layer.property("ADBE Transform Group");
        var scale = transform ? transform.property("ADBE Scale") : null;
        if (!scale) {
            throw new Error("Layer has no editable scale: " + layer.name);
        }

        var safeCtrlName = ctrlName.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        var safeGradientName = gradientName.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
        var expr =
            'ctrl=thisComp.layer("' + safeCtrlName + '");\n' +
            'grad=thisComp.layer("' + safeGradientName + '");\n' +
            'r=grad.effect("Carousel Gradient");\n' +
            'p=thisLayer.toComp(anchorPoint);\n' +
            'a=r(1); b=r(3);\n' +
            'c1=r(2); c2=r(4);\n' +
            'v=b-a;\n' +
            'den=Math.max(0.0001,v[0]*v[0]+v[1]*v[1]);\n' +
            'u=clamp(((p[0]-a[0])*v[0]+(p[1]-a[1])*v[1])/den,0,1);\n' +
            'l1=(c1[0]+c1[1]+c1[2])/3;\n' +
            'l2=(c2[0]+c2[1]+c2[2])/3;\n' +
            'luma=linear(u,0,1,l1,l2);\n' +
            'minS=ctrl.effect("Min Scale")("Slider")/100;\n' +
            'maxS=ctrl.effect("Max Scale")("Slider")/100;\n' +
            's=linear(luma,0,1,maxS,minS);\n' +
            'value*s;';
        scale.expression = expr;
    }

    var pal = buildUI(thisObj);
    if (pal instanceof Window) {
        pal.center();
        pal.show();
    }
})(this);
