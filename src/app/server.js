import "./env.ts"; // MUST be first
import { loadEnv } from "./env.ts";
import { githubWebhookRoute } from "./routes/githubWebhook.ts";
const env = loadEnv();
const app = express();
// GitHub sends JSON
app.use(express.json({ limit: "2mb" }));
// Webhook endpoint
app.post("/github/webhook", githubWebhookRoute);
app.listen(env.PORT, () => {
    console.log(`🚀 Task Assistant GitHub App running on port ${env.PORT}`);
});
