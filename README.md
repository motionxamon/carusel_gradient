# Carousel Gradient Rig for After Effects

A minimal After Effects ScriptUI panel for building a controllable 2D/3D carousel from selected layers, with optional gradient-driven scale.

## Features

- Builds a carousel from selected layers: shapes, text, images, footage, precomps.
- Creates a central `Carousel CTRL` null.
- Parents all carousel layers to the null, so you can rotate/move the whole rig as one object.
- Supports 2D and 3D carousel layouts.
- Optionally creates a camera and sets selected layers to face the camera.
- Optional gradient scale mode: layers scale based on their position along a hidden gradient controller.

## Install

Copy `CarouselRig.jsx` to your After Effects ScriptUI Panels folder:

```text
/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/
```

Restart After Effects, then open:

```text
Window > CarouselRig.jsx
```

## Usage

1. Open a composition.
2. Select the layers you want to arrange into a carousel.
3. Open the `CarouselRig.jsx` panel.
4. Set `Radius`, `Rotation`, and `Offset`.
5. Enable `3D` if you want a 3D carousel.
6. Enable `Face Camera` if you want the layers to auto-orient toward the camera.
7. Enable `Gradient Scale` if you want scale to react to a gradient.
8. Click `Create Carousel`.

## Controls

The script creates a `Carousel CTRL` null in the center of the composition.

- `Radius`: controls the carousel radius.
- `Rotation`: rotates the layer distribution around the carousel. Animate this for a spinning carousel.
- `Offset`: compresses or expands the spacing between layers.
  - `0` keeps normal circular spacing.
  - Positive values pull layers closer together.
  - Negative values push layers farther apart.
- `Min Scale`: created only with `Gradient Scale`; smallest scale multiplier.
- `Max Scale`: created only with `Gradient Scale`; largest scale multiplier.

You can also rotate the `Carousel CTRL` null itself:

- In 2D mode, use regular Z rotation.
- In 3D mode, use X/Y/Z rotation for full object-like movement.

## Gradient Scale

When `Gradient Scale` is enabled, the script creates a hidden layer named:

```text
Carousel Gradient Scale
```

This layer contains a `Carousel Gradient` Ramp effect. The carousel layers read the ramp's start/end points and colors through expressions, then map brightness to scale:

- Darker areas move toward `Max Scale`.
- Brighter areas move toward `Min Scale`.

The gradient layer is hidden, shy, and marked as a guide layer. You can still select it from the timeline if you need to edit the Ramp effect.

This version does not use `sampleImage()`. It reads the Ramp parameters directly, which is faster and allows the gradient controller layer to stay hidden.

---

# Carousel Gradient Rig для After Effects

Минималистичная ScriptUI-панель для After Effects, которая собирает 2D/3D-карусель из выделенных слоев и, при желании, добавляет скейл от градиента.

## Возможности

- Собирает карусель из выделенных слоев: shape, text, картинки, видео, precomp.
- Создает центральный null `Carousel CTRL`.
- Привязывает все слои карусели к этому null, чтобы весь риг можно было двигать и крутить как один объект.
- Поддерживает 2D и 3D раскладку.
- Может создать камеру и включить auto-orient слоев к камере.
- Может добавить gradient scale: размер слоев меняется в зависимости от положения относительно скрытого градиента.

## Установка

Скопируйте `CarouselRig.jsx` в папку ScriptUI Panels:

```text
/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/
```

Перезапустите After Effects и откройте панель:

```text
Window > CarouselRig.jsx
```

## Использование

1. Откройте композицию.
2. Выделите слои, которые нужно собрать в карусель.
3. Откройте панель `CarouselRig.jsx`.
4. Настройте `Radius`, `Rotation` и `Offset`.
5. Включите `3D`, если нужна 3D-карусель.
6. Включите `Face Camera`, если слои должны смотреть в камеру.
7. Включите `Gradient Scale`, если размер должен реагировать на градиент.
8. Нажмите `Create Carousel`.

## Контролы

Скрипт создает null `Carousel CTRL` в центре композиции.

- `Radius`: радиус карусели.
- `Rotation`: прокрутка слоев по кругу. Удобно анимировать для вращения карусели.
- `Offset`: сжимает или расширяет расстояние между слоями.
  - `0` оставляет обычное равномерное расположение.
  - Положительные значения собирают слои ближе друг к другу.
  - Отрицательные значения раздвигают слои дальше.
- `Min Scale`: создается только при `Gradient Scale`; минимальный множитель масштаба.
- `Max Scale`: создается только при `Gradient Scale`; максимальный множитель масштаба.

Также можно крутить сам `Carousel CTRL`:

- В 2D-режиме обычным Z rotation.
- В 3D-режиме по X/Y/Z, как цельный объект.

## Gradient Scale

Если включить `Gradient Scale`, скрипт создаст скрытый слой:

```text
Carousel Gradient Scale
```

На нем лежит Ramp effect с именем `Carousel Gradient`. Слои карусели через expressions читают точки и цвета этого Ramp effect, считают яркость и мапят ее в scale:

- Темные области двигают слой к `Max Scale`.
- Светлые области двигают слой к `Min Scale`.

Gradient layer скрыт, зашайен и помечен как guide layer. При необходимости его можно найти в таймлайне и отредактировать Ramp effect руками.

В этой версии не используется `sampleImage()`. Скрипт читает параметры Ramp напрямую, поэтому это быстрее и позволяет держать gradient layer скрытым.
