# Decisiones de la solución

## 1. Necesidad priorizada

El responsable de mantenimiento no necesita ver los 25 movimientos uno por uno:
necesita saber **dónde se concentra el gasto** y **si algo se está saliendo de
control**. Prioricé tres capas, de lo general a lo específico: (1) un resumen
numérico inmediato, (2) evolución mensual y comparación por planta/categoría/equipo
para ubicar concentración, y (3) un hallazgo escrito que señale una alerta
accionable sin que el usuario tenga que interpretar gráficas por su cuenta. La
tabla cruda queda al final, como respaldo para auditar el detalle una vez que la
persona ya sabe qué está buscando.

## 2. Hallazgo principal

a) Inviabilidad Operativa del Motor M-04
b) Hiperinflación en Refacciones y Suministros
c) Fuga de Capital en Servicios Externos

## 3. Tratamiento de cancelaciones

Las excluí del gasto total, del ticket promedio, de la categoría con mayor gasto
y de ambas gráficas, porque un movimiento cancelado no representa gasto real y
mezclarlo distorsiona los totales (en este dataset resta $18,000 que nunca se
ejecutaron). Sí las dejo visibles en la tabla de datos en crudo, marcadas con una
etiqueta "Cancelación", para que quien audite pueda verificar que la cancelación
existe y a qué movimiento corresponde. El resumen indica cuántas cancelaciones
quedaron fuera del cálculo para que sea explícito, no silencioso.

## 4. Siguiente mejora

Con más tiempo agregaría: (a) detalle al hacer clic en una fila (modal con
histórico de ese artículo/equipo), (b) comparación contra el periodo anterior
(variación % mes contra mes, no solo el nivel), (c) exportar la vista filtrada a
CSV (excel), (d) una tabla de datos accesible como alternativa textual a las gráficas para
lectores de pantalla.
