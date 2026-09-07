// ===========================================================
// Nandini Unique — single point of configuration
// Loaded before js/api.js on every page.
//
// While testing on your own computer, leave this as-is.
// When you deploy the backend somewhere public (Render, Railway, etc.),
// this is the ONLY line you need to change across the whole project.
// ===========================================================

const API_ORIGIN = ["localhost", "127.0.0.1"].includes(window.location.hostname)
	? "http://localhost:5000"
	: "https://nandini-unique-api.onrender.com";
