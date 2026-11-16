# The Art Factory — website and product admin

## Run the website and admin panel

Requires Node.js 18 or newer. In the project folder, run:

```powershell
npm start
```

Open the website at `http://localhost:8787` and the admin panel at `http://localhost:8787/admin`. On first startup, the server prints a temporary admin password in its console. Set an `ADMIN_PASSWORD` environment variable before starting the server to use a password you choose and keep across restarts.

The admin panel supports adding products, uploading JPG/PNG/WebP images, setting prices in INR, setting stock, hiding products, and deleting products. Blank price means “Custom quote”; blank stock means “Made to order”. Product data is saved in `data/products.json`; uploaded images are saved in `uploads/`. The storefront reads active products from the server, so changes appear for visitors using this server.

## Order and hosting notes

Orders are prepared in WhatsApp. This site does not process online payments. The admin panel uses this Node server and its local file storage; it will not work on static-only hosting. A public deployment needs a persistent Node host and persistent storage for `data/` and `uploads/`. Use a stable secret `ADMIN_PASSWORD` on that host and serve it over HTTPS.

WhatsApp links currently open the recipient picker because no business number was supplied. Replace the generic Instagram links and blank-recipient email links in `index.html` with the studio's actual contact details. Replace the sample testimonial with an approved customer review. The supplied work includes five portrait examples; the gallery can be extended with additional original artwork files.

