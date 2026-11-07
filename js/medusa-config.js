window.MEDUSA_BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:9000"
    : window.location.origin;

window.MEDUSA_PUBLISHABLE_KEY =
  "pk_55634989086e01785152d5cd133bc48512f9cad0323bc140bfd40c74fa79b001";
