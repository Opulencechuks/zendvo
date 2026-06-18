"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const instrumentation_1 = require("./instrumentation");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS for frontend domain (localhost:3000)
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true
}));
// Serve static avatars uploaded by users
// Supports uploads saved locally
app.use("/avatars", express_1.default.static(path_1.default.join(__dirname, "../public/avatars")));
// Mount the API Router
app.use(routes_1.apiRouter);
// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Backend Express Server running on http://localhost:${PORT}`);
    // Register instrumentation (runs database checks & background cron jobs)
    await (0, instrumentation_1.register)();
});
