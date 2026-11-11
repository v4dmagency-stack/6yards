window.MEDUSA_BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:9000"
    : window.location.origin;

window.MEDUSA_PUBLISHABLE_KEY =
  "pk_64b3b54a854040ab9e9defda6518ce9b9dbaeb0b91bc57fd5c7f35b39d946917";
