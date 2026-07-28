# finanzas-frontend

Interfaz del plan financiero. React 19 + Vite + TypeScript, sin librerías de UI
ni de gráficos: los charts son SVG propio.

## Correr

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` y hace proxy de `/api` a `http://localhost:8080`
(configurable con `VITE_API_URL`). Necesita `finanzas-api` corriendo.

## Vistas

Una pestaña por hoja del Excel original, más el histórico:

- **Resumen** — indicadores del mes y curva de ahorro hacia la meta.
- **Ingresos** — sueldos, dólar de referencia y base conservadora del plan.
- **Gastos mensuales** — tabla editable, distribución por grupo y por tipo.
- **Plan mensual** — las dos etapas y el reparto porcentual del ingreso base.
- **Tarjetas** — saldos, pagos y prioridad de cancelación.
- **Apartamento** — meta, proyección a 36 meses y tabla mes a mes.
- **Histórico** — evolución de gastos, disponible y ahorro entre meses.

## Cómo edita

Los campos de tabla confirman **al perder el foco**, no en cada tecla, para no
disparar un recálculo por pulsación. Cada guardado devuelve el mes entero ya
resuelto desde la API, así que la pantalla nunca recalcula nada por su cuenta —
no hay forma de que la UI y el backend muestren números distintos.

El selector del encabezado cambia de mes; **Nuevo mes** crea el siguiente
clonando el actual (gastos, tarjetas y plan), listo para ajustar.

## Gráficos

Paleta y specs siguen el sistema de data-viz: azul `#2a78d6` / verde `#1baf7a`
en claro, `#3987e5` / `#199e70` en oscuro, validados para separación CVD y
contraste contra ambas superficies. Los tres charts son SVG con `viewBox`, se
adaptan al ancho y traen tooltip al pasar el mouse.
