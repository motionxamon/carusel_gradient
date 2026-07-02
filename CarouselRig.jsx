/*
CarouselRig.jsx
After Effects ScriptUI panel for arranging selected layers into a 2D/3D carousel
with optional gradient-driven scale.
*/

(function carouselRig(thisObj) {
    var SCRIPT_NAME = "Carousel Rig";
    var CTRL_NAME = "Carousel Control";
    var CAMERA_NAME = "Carousel Camera";
    var GRADIENT_NAME = "Carousel Gradient Scale";

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

        pal.orientation = "column";
        pal.alignChildren = ["fill", "top"];
        pal.spacing = 8;
        pal.margins = 10;

        var layoutPanel = pal.add("panel", undefined, "Carousel");
        layoutPanel.orientation = "column";
        layoutPanel.alignChildren = ["left", "top"];
        layoutPanel.margins = 10;

        var make3DCheck = layoutPanel.add("checkbox", undefined, "3D Layers");
        make3DCheck.value = true;
        try {
            make3DCheck.helpTip = "Turns every selected carousel layer into a 3D layer and places it around the 3D carousel center.";
        } catch (err) {}

        var faceCameraCheck = layoutPanel.add("checkbox", undefined, "Face Camera");
        faceCameraCheck.value = true;
        try {
            faceCameraCheck.helpTip = "Applies Auto-Orient toward the carousel camera.";
        } catch (err) {}

        var gradientPanel = pal.add("panel", undefined, "Gradient Control");
        gradientPanel.orientation = "column";
        gradientPanel.alignChildren = ["left", "top"];
        gradientPanel.margins = 10;

        var gradientScaleCheck = gradientPanel.add("checkbox", undefined, "Gradient Scale");
        gradientScaleCheck.value = false;

        var createBtn = pal.add("button", undefined, "Create Carousel");
        createBtn.onClick = function () {
            app.beginUndoGroup(SCRIPT_NAME);
            try {
                var comp = activeComp();
                createCarousel({
                    comp: comp,
                    radius: defaultRadius(comp),
                    rotation: 0,
                    offset: 0,
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

    function addEffect(layer, matchName, name) {
        var fx = layer.property("ADBE Effect Parade");
        if (!fx) {
            throw new Error("Layer cannot receive controls: " + layer.name);
        }

        var prop = fx.property(name);
        if (!prop) {
            prop = fx.addProperty(matchName);
            prop.name = name;
        }
        return prop;
    }

    function addSlider(layer, name, value) {
        var prop = addEffect(layer, "ADBE Slider Control", name);
        prop.property(1).setValue(value);
        return prop;
    }

    function addAngle(layer, name, value) {
        var prop = addEffect(layer, "ADBE Angle Control", name);
        prop.property(1).setValue(value);
        return prop;
    }

    function createController(comp, opts) {
        var ctrl = comp.layers.addNull();
        ctrl.name = uniqueName(comp, CTRL_NAME);
        ctrl.threeDLayer = opts.make3D;
        ctrl.label = 9;

        var position = opts.make3D
            ? [comp.width / 2, comp.height / 2, 0]
            : [comp.width / 2, comp.height / 2];
        ctrl.property("ADBE Transform Group").property("ADBE Position").setValue(position);

        addSlider(ctrl, "Radius", opts.radius);
        addAngle(ctrl, "Rotation", opts.rotation);
        addAngle(ctrl, "Offset", opts.offset);

        if (opts.gradientScale) {
            addSlider(ctrl, "Min Scale", 55);
            addSlider(ctrl, "Max Scale", 115);
        }
        return ctrl;
    }

    function usesGradient(opts) {
        return opts.gradientScale;
    }

    function createGradientLayer(comp) {
        var layer = layerByName(comp, GRADIENT_NAME);
        if (layer && layer.matchName !== "ADBE Camera Layer" && layer.matchName !== "ADBE Light Layer") {
            ensureGradientLayerSetup(layer, comp);
            return layer;
        }

        layer = comp.layers.addSolid([1, 1, 1], GRADIENT_NAME, comp.width, comp.height, comp.pixelAspect, comp.duration);
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
            ramp.property(1).setValue([0, 0]);
            ramp.property(2).setValue([1, 1, 1]);
            ramp.property(3).setValue([comp.width, comp.height]);
            ramp.property(4).setValue([0, 0, 0]);
        } catch (err) {}
    }

    function createCamera(comp, afterLayer) {
        var camera = layerByName(comp, CAMERA_NAME);
        if (camera && camera.matchName === "ADBE Camera Layer") {
            if (afterLayer) {
                try {
                    camera.moveAfter(afterLayer);
                } catch (err) {}
            }
            return camera;
        }

        camera = comp.layers.addCamera(CAMERA_NAME, [comp.width / 2, comp.height / 2]);
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
        if (afterLayer) {
            camera.moveAfter(afterLayer);
        }
        return camera;
    }

    function createCarousel(opts) {
        var comp = opts.comp;
        var layers = selectedCarouselLayers(comp);
        var gradientLayer = usesGradient(opts) ? createGradientLayer(comp) : null;
        var ctrl = createController(comp, opts);
        var bottomCarouselLayer = lastLayerInStack(layers);

        if (opts.make3D) {
            createCamera(comp, bottomCarouselLayer);
        }
        ctrl.moveBefore(firstLayerInStack(layers));

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            layer.threeDLayer = opts.make3D;
            addSlider(layer, "Carousel Index", i + 1);
            addSlider(layer, "Carousel Count", layers.length);
            fitLayerToComp(layer, comp, opts.make3D);
            layer.parent = ctrl;
            if (opts.make3D && opts.faceCamera) {
                try {
                    layer.autoOrient = AutoOrientType.CAMERA_OR_POINT_OF_INTEREST;
                } catch (err) {}
            }
            applyPositionExpression(layer, ctrl.name, opts.make3D);
            if (opts.gradientScale) {
                applyGradientScaleExpression(layer, ctrl.name, gradientLayer.name);
            }
        }
    }

    function firstLayerInStack(layers) {
        var first = layers[0];
        for (var i = 1; i < layers.length; i++) {
            if (layers[i].index < first.index) {
                first = layers[i];
            }
        }
        return first;
    }

    function lastLayerInStack(layers) {
        var last = layers[0];
        for (var i = 1; i < layers.length; i++) {
            if (layers[i].index > last.index) {
                last = layers[i];
            }
        }
        return last;
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
        if (is3D) {
            scaleProp.setValue([fit, fit, fit]);
        } else {
            scaleProp.setValue([fit, fit]);
        }
    }

    function escapeLayerName(name) {
        return name.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    function carouselSharedExpression(ctrlName) {
        var safeCtrlName = escapeLayerName(ctrlName);
        return '' +
            'ctrl=thisComp.layer("' + safeCtrlName + '");\n' +
            'idx=effect("Carousel Index")("Slider")-1;\n' +
            'count=Math.max(1,Math.round(effect("Carousel Count")("Slider")));\n' +
            'rotation=degreesToRadians(ctrl.effect("Rotation")("Angle"));\n' +
            'offset=degreesToRadians(ctrl.effect("Offset")("Angle"));\n' +
            'step=(Math.PI*2/count)+offset;\n' +
            'a=rotation+idx*step;\n';
    }

    function applyPositionExpression(layer, ctrlName, is3D) {
        var base = carouselSharedExpression(ctrlName);
        var posExpr;
        if (is3D) {
            posExpr = base +
                'radius=ctrl.effect("Radius")("Slider");\n' +
                'base=[Math.sin(a)*radius,0,Math.cos(a)*radius];\n';
        } else {
            posExpr = base +
                'radius=ctrl.effect("Radius")("Slider");\n' +
                'base=[Math.sin(a)*radius,Math.cos(a)*radius*0.28];\n';
        }

        posExpr += 'base;';

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

        var safeCtrlName = escapeLayerName(ctrlName);
        var safeGradientName = escapeLayerName(gradientName);
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
            's=linear(luma,0,1,minS,maxS);\n' +
            'value*s;';
        scale.expression = expr;
    }

    var pal = buildUI(thisObj);
    if (pal instanceof Window) {
        pal.center();
        pal.show();
    }
})(this);
