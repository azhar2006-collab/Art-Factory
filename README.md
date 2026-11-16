# The Art Factory — static website and browser admin

## Open the admin panel

Open `admin.html` from the same website address as `index.html`. The panel can add and edit products, upload product images, set INR prices and stock, hide items, and delete items. The storefront reads the saved catalogue from this browser.

Product changes are stored in browser local storage. They are available to the same browser on the same site address, but do not sync to other browsers, devices, or visitors. Clearing browser data removes these changes. Uploaded images are resized and stored in the browser; available storage depends on the browser.

For a shared live catalogue that all visitors see, the site will need a backend or hosted database later. This version has no backend and can be hosted as a static site.

## Orders and contact

Orders are prepared in WhatsApp; the website does not process online payments. WhatsApp links currently open the recipient picker because no business number was supplied. Replace the generic Instagram links and blank-recipient email links in `index.html` with the studio's actual contact details. Replace the sample testimonial with an approved customer review. The supplied portfolio has five portrait examples; additional original artworks can be added to the gallery.

