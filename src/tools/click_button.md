```yaml
type: function
function:
  name: click_button
  description: Click a button on the current page. Use get_button_ids first to get the button coordinates.
  parameters:
    type: object
    properties:
      x_coord:
        type: number
        description: The x coordinate of the button
      y_coord:
        type: number
        description: The y coordinate of the button
    required:
      - x_coord
      - y_coord
  exec: kotlin
```

```kotlin
import java.awt.MouseInfo
import java.awt.Robot
import java.awt.event.InputEvent
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin

fun moveMouseSmoothly(targetX: Int, targetY: Int, steps: Int = 75, delay: Long = 5L) {
    val robot = Robot()
    val startX = MouseInfo.getPointerInfo().location.x
    val startY = MouseInfo.getPointerInfo().location.y

    val deltaX = targetX - startX
    val deltaY = targetY - startY
    val distance = Math.hypot(deltaX.toDouble(), deltaY.toDouble())
    if (distance == 0.0) return

    val stepSize = distance / steps
    val angle = atan2(deltaY.toDouble(), deltaX.toDouble())

    for (i in 0 until steps) {
        val x = startX + (i * stepSize * cos(angle)).toInt()
        val y = startY + (i * stepSize * sin(angle)).toInt()
        robot.mouseMove(x, y)
        Thread.sleep(delay)
    }

    robot.mouseMove(targetX, targetY)
}

fun clickMouse(button: Int = 1) {
    val robot = Robot()

    val buttonMask = when (button) {
        1 -> InputEvent.BUTTON1_DOWN_MASK  // Left button
        2 -> InputEvent.BUTTON2_DOWN_MASK  // Middle button
        3 -> InputEvent.BUTTON3_DOWN_MASK  // Right button
        else -> throw IllegalArgumentException("Invalid mouse button: $button")
    }

    robot.mousePress(buttonMask)
    robot.mouseRelease(buttonMask)
}

val browserCoords = browser.uiComponent.getLocationOnScreen()
moveMouseSmoothly(x_coord.toInt() + browserCoords.x, y_coord.toInt() + browserCoords.y)
clickMouse()
```