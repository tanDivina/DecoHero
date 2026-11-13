# Política de privacidad de DecoHero
_Última actualización: 12 de noviembre de 2026_

<!-- Nota del repositorio (no se publica). Fuente en español de https://deco.hero-apps.com/es/privacy.
     La fuente en inglés es PRIVACY_POLICY.md en la raíz. Mantener ambas al día. -->

DecoHero es una app de Divina Endeavors LLC (Hero Apps), Estados Unidos, responsable de los datos descritos aquí. Contacto: support@hero-apps.com. Si esta traducción difiere de la versión en inglés, prevalece la versión en inglés.

Esta política cubre la app DecoHero para Android, la app web de DecoHero en https://deco.hero-apps.com/app y el sitio web https://deco.hero-apps.com.

## En resumen
DecoHero no tiene anuncios ni analítica. Para crear un rediseño, la app envía la foto de la habitación que eliges a nuestro servidor, que la pasa a la API Gemini de Google y devuelve el diseño a tu dispositivo. No guardamos tus fotos ni los diseños. Nuestro servidor sí guarda un pequeño registro para que tus créditos funcionen: tu saldo de créditos, tus compras, qué estilos generaste, los diseños que reportaste y, solo durante las primeras 48 horas, la dirección IP desde la que te conectaste por primera vez.

- **App para Android:** no hay cuentas. El registro está vinculado a un ID de instalación aleatorio.
- **App web:** sí hay cuentas. Inicias sesión con Google mediante Firebase Authentication, y el registro está vinculado al ID de usuario de ese inicio de sesión. Nuestro servidor no guarda tu correo, tu nombre ni tu foto de perfil; Firebase Authentication, un servicio de Google, conserva el correo y el nombre de tu cuenta de Google.

Guardamos el resto de ese registro hasta que lo borres o nos pidas borrarlo.

## 1. Tus fotos y diseños
Cuando tocas para rediseñar, la app reduce tu foto (a un máximo de 1280 píxeles en el lado largo) y la envía por una conexión cifrada a nuestro servidor, junto con el estilo que elegiste. Nuestro servidor envía la foto y una instrucción de estilo fija a la API Gemini de Google, recibe la imagen rediseñada y la devuelve a tu dispositivo.

- Nuestro servidor maneja la foto y el diseño solo en memoria. No los escribe en su base de datos, en disco ni en sus registros, y desaparecen al terminar la solicitud.
- Usamos la API Gemini de pago de Google. Según sus condiciones, Google no usa tus fotos ni diseños para mejorar sus productos. Google puede conservarlos por un tiempo limitado para detectar abusos.
- En tu teléfono, los diseños se guardan en la caché temporal de la app. Se guardan en tu galería solo cuando tocas Guardar, y se comparten solo cuando tocas Compartir.
- En la app web, los diseños se mantienen en la memoria de la página y desaparecen al cerrarla o recargarla. Un diseño se guarda en tu dispositivo solo cuando eliges Guardar, que descarga la imagen, y se comparte solo cuando eliges Compartir.
- No puedes escribir tus propias instrucciones. Cada diseño usa uno de los estilos fijos de la app.

## 2. Qué guarda nuestro servidor
**App para Android.** La primera vez que abres DecoHero, la app crea un ID de instalación aleatorio en tu teléfono. En Android no está vinculado a tu nombre, correo, número de teléfono ni cuenta de Google.

**App web.** Cuando inicias sesión con Google (sección 3), nuestro servidor crea un ID de usuario aleatorio para ti y lo guarda junto con el ID de usuario de Firebase de tu inicio de sesión. En la web, ese ID de usuario aleatorio ocupa el lugar del ID de instalación. Nuestro servidor no guarda tu correo, tu nombre ni tu foto de perfil.

Nuestro servidor guarda lo siguiente, vinculado a ese ID:

| Registro | Qué contiene | Para qué |
|---|---|---|
| Registro de instalación o de cuenta | ID de instalación (Android), o ID de usuario aleatorio e ID de usuario de Firebase (web), saldo de créditos, si alguna vez compraste créditos, si se te negaron los créditos gratis por el límite descrito aquí, la fecha de creación del registro y la dirección IP desde la que te conectaste por primera vez (en IPv6, solo la parte de red, los cuatro primeros bloques). La dirección IP se borra automáticamente cuando el registro cumple 48 horas. | Mantener tu saldo de créditos. La dirección IP nos permite dar créditos gratis a un número limitado de instalaciones o cuentas nuevas por dirección IP al día, para evitar el abuso de créditos gratis. |
| Compras | Tu ID, el paquete de créditos comprado, el número de créditos, el ID de evento de RevenueCat, el ID de transacción de Google Play o del pago en la web, la hora y la hora de cualquier reembolso | Sumar los créditos que pagaste una sola vez, y quitarlos de nuevo si la compra se reembolsa |
| Registro de diseños | Tu ID, el estilo generado, si funcionó y la hora | Detectar abusos, controlar costos y responder consultas de soporte |
| Reportes | Tu ID, el estilo del diseño que reportaste y la hora. El reporte no incluye tu foto ni el diseño. | Revisar los resultados de IA que los usuarios señalan |
| Totales diarios | El número de diseños creados por día, sin datos personales | Límites de gasto diarios |

**Dirección IP.** Además de la copia en el registro de instalación o de cuenta, el servidor guarda tu dirección IP en memoria durante un máximo de 10 minutos para limitar cuántas solicitudes puede hacer una conexión. Esa copia no se escribe en disco.

**Registros del servidor.** Nuestro proveedor de alojamiento conserva la salida de registros del servidor durante un periodo limitado que fija el proveedor. Estos registros contienen mensajes de error, por cada compra tu ID y el paquete de créditos, y por cada reembolso el paquete de créditos. No contienen fotos ni diseños. Los registros de solicitudes del proveedor también guardan la dirección IP, la hora y la dirección web de cada solicitud a nuestro servidor; en versiones anteriores de la app para Android esa dirección incluye el ID de instalación.

## 3. Inicio de sesión en la web
La app para Android no tiene inicio de sesión. La app web usa el inicio de sesión de Google mediante Firebase Authentication, un servicio de Google.

- Cuando inicias sesión, Google te pregunta qué cuenta usar. Firebase Authentication le da entonces a la app web el perfil básico de esa cuenta: un ID de usuario, tu correo, tu nombre y tu foto de perfil. Nuestro servidor guarda solo el ID de usuario. Nunca vemos tu contraseña de Google.
- Firebase Authentication guarda tu registro de inicio de sesión en los servidores de Google, como nuestro encargado del tratamiento (ID de usuario, correo, nombre, dirección de la foto de perfil y horas de inicio de sesión). Google también registra la dirección IP y los datos del navegador de los inicios de sesión por seguridad, y conserva esos registros por un tiempo limitado.
- Cada solicitud de la app web a nuestro servidor lleva un token de sesión de corta duración, que nuestro servidor verifica con las claves públicas de Google.

## 4. Compra de créditos
**App para Android.** Los pagos los gestiona Google Play. Nunca vemos los datos de tu tarjeta, y nuestro servidor no recibe tu nombre ni el correo de tu cuenta de Google. Usamos RevenueCat para confirmar las compras: la app le da a RevenueCat tu ID de instalación como ID de usuario, y RevenueCat recibe los datos de tu compra en Google Play e información técnica básica de su SDK (como la versión de la app y la plataforma del dispositivo). Después RevenueCat le indica a nuestro servidor qué paquete de créditos sumar. Si Google Play reembolsa una compra, RevenueCat avisa a nuestro servidor y los créditos de ese paquete se restan de tu saldo.

**App web.** Los pagos los gestiona Stripe mediante RevenueCat Web Billing. Escribes los datos de tu tarjeta en un formulario de pago operado por RevenueCat y Stripe. DecoHero nunca ve ni guarda el número de tu tarjeta. La app web pasa al pago tu ID de usuario aleatorio y el correo de tu inicio de sesión con Google, así que RevenueCat recibe tu ID de usuario, ese correo (usado para el recibo) y los datos de la compra. Stripe recibe tus datos de pago y tu correo, además de información técnica que usa para prevenir fraudes, como tu dirección IP y tu navegador. Después RevenueCat le indica a nuestro servidor qué paquete de créditos sumar. Si una compra se reembolsa, RevenueCat avisa a nuestro servidor y los créditos de ese paquete se restan de tu saldo.

## 5. Quién más recibe datos
| Proveedor | Qué recibe | Para qué |
|---|---|---|
| API Gemini de Google (Google LLC) | Tu foto de la habitación y la instrucción de estilo | Crea el rediseño |
| RevenueCat, Inc. | ID de instalación o ID de usuario, datos de la compra, información básica del dispositivo, del navegador y de la app; en la web, también el correo de tu inicio de sesión con Google | Confirma las compras e indica a nuestro servidor que sume créditos |
| Google Play (Google LLC) | Tu compra, en tu cuenta de Google (app para Android) | Procesa el pago |
| Stripe, Inc. | Los datos de tu tarjeta y del pago, tu correo, tu dirección IP e información del navegador (app web) | Procesa los pagos con tarjeta en la web y previene fraudes |
| Firebase Authentication (Google LLC) | El ID de usuario, el correo, el nombre y la dirección de la foto de perfil de tu cuenta de Google, además de la dirección IP y los datos del navegador de los inicios de sesión (app web), como nuestro encargado del tratamiento | Inicio de sesión con Google en la web |
| Nuestro proveedor de alojamiento en la nube | Todo lo que recibe nuestro servidor, como encargado del tratamiento | Ejecuta el servidor de DecoHero y su base de datos |
| Vercel Inc. | La dirección IP, la hora y la dirección web de cada solicitud de una página o archivo del sitio web o de la app web | Aloja el sitio web y los archivos de la app web |
| Google Fonts (Google LLC) | Tu dirección IP y los datos de tu navegador cuando el sitio web carga sus tipografías | Sirve las tipografías del sitio web |

Cada proveedor trata los datos según sus propias condiciones: Google (https://policies.google.com/privacy), RevenueCat (https://www.revenuecat.com/privacy), Stripe (https://stripe.com/privacy), Vercel (https://vercel.com/legal/privacy-policy). No vendemos, alquilamos ni compartimos datos personales con nadie más.

## 6. La lista de espera de Android en el sitio web
Si te apuntas a la lista de espera de Android en https://deco.hero-apps.com, guardamos tu correo, el idioma de la página, la dirección de la página y la hora en nuestra propia base de datos de mensajes (Cloud Firestore, un servicio de Google). Un aviso con los mismos datos llega a nuestro correo mediante FormSubmit (https://formsubmit.co). Usamos tu correo solo para avisarte cuando la app para Android esté disponible. Para salir de la lista, escribe a support@hero-apps.com.

## 7. Permisos
**App para Android.**

- **Cámara:** para fotografiar una habitación. También puedes elegir una foto existente con el selector de fotos de Android, que no necesita permiso.
- **Almacenamiento (solo en versiones antiguas de Android):** para guardar un diseño en tu galería cuando tocas Guardar.

**App web.** Eliges una foto con el selector de archivos o de cámara de tu propio navegador.

DecoHero no usa tu ubicación, tus contactos, tu micrófono ni tu ID de publicidad.

## 8. Almacenamiento del navegador y cookies
La app web guarda una pequeña cantidad de datos en el almacenamiento de tu navegador (almacenamiento local y similares) para funcionar entre visitas:

- tu sesión iniciada, gestionada por Firebase Authentication, para que sigas con la sesión abierta;
- ajustes de la app, como el idioma que elegiste.

Durante el pago, Stripe y RevenueCat pueden usar sus propias cookies o almacenamiento del navegador para procesar el pago y prevenir fraudes. El sitio web y la app web no usan cookies de publicidad ni de analítica. Cerrar sesión, o borrar los datos del sitio deco.hero-apps.com en tu navegador, elimina lo que la app web guardó.

<!-- TODO(Dorien): listar las claves exactas de almacenamiento local cuando la app web esté terminada (ver PRIVACY_POLICY.md). -->

## 9. Lo que no hacemos
- Sin publicidad, sin ID de publicidad, sin SDK de analítica y sin SDK de informes de fallos.
- No vendemos datos personales y no usamos tus fotos para entrenar modelos de IA.
- App para Android: sin cuentas, contraseñas ni inicio de sesión.
- App web: sin contraseñas propias. Google gestiona el inicio de sesión, y nuestro servidor no guarda correo, nombre ni foto de perfil.

## 10. Cuánto tiempo guardamos los datos y cómo borrarlos
Las fotos y los diseños no se guardan en nuestro servidor. La dirección IP de tu registro de instalación o de cuenta se borra automáticamente cuando el registro cumple 48 horas. Los demás registros de la sección 2 no caducan automáticamente por ahora: los guardamos hasta que los borres o nos pidas borrarlos. Los registros de compras pueden tener que conservarse más tiempo cuando lo exija la ley fiscal o contable.

**App web.** Abre Acerca de y privacidad en la app web y elige Eliminar cuenta. Esto quita de inmediato de nuestro servidor el vínculo con tu inicio de sesión, tu saldo de créditos, tu registro de diseños y tus reportes, y borra tu cuenta en Firebase Authentication. Los registros de compras se conservan por motivos fiscales y contables, ya sin vínculo con la cuenta. Los créditos sin usar se pierden y no se pueden recuperar. Si no puedes iniciar sesión, escribe a support@hero-apps.com desde el correo de tu cuenta de Google y borramos la cuenta por ti.

<!-- TODO(Dorien): borrar la cuenta no elimina el registro de cliente que RevenueCat y Stripe guardan de compras web anteriores (ver PRIVACY_POLICY.md). -->

**App para Android.** Para borrar tus datos, escribe a support@hero-apps.com. Incluye tu ID de instalación: lo encuentras en la app en Acerca de y privacidad (enlace al final de la pantalla de inicio), donde puedes copiarlo o compartirlo. Si ya no tienes la app, envíanos en su lugar:

- el número de pedido de Google Play de una compra de créditos (empieza por GPA. y aparece en el correo de recibo de Google Play), o
- la fecha y hora aproximadas en que abriste la app por primera vez.

Borramos lo que encontremos en un plazo de 30 días y te lo confirmamos por correo. Desinstalar DecoHero elimina el ID de instalación de tu teléfono, así que una nueva instalación empieza de cero. Eso no borra por sí solo el registro en nuestro servidor, y los créditos sin usar de la instalación anterior no se pueden recuperar.

Según el RGPD, la CCPA y leyes similares, también puedes pedirnos qué datos tenemos sobre ti, pedir que los corrijamos u oponerte a cómo los usamos. Escribe a la misma dirección. Respondemos en un plazo de 30 días.

## 11. Seguridad
Todo el tráfico entre la app, nuestro servidor, Google, RevenueCat y Stripe va cifrado con HTTPS. La versión publicada de la app para Android se niega a conectarse a una dirección de servidor que no sea HTTPS. Nuestra clave de la API Gemini vive solo en el servidor, nunca en la app ni en la página web.

## 12. Menores
DecoHero está pensada para adultos. No está dirigida a menores de 13 años y no recopilamos sus datos a sabiendas.

## 13. Cambios y contacto
Si cambiamos lo que DecoHero hace con los datos, actualizamos esta página y la fecha de arriba. Consultas: support@hero-apps.com, Divina Endeavors LLC, Estados Unidos.
