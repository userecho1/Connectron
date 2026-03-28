import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function run() {
    try {
        console.log("Connecting...");
        // the server must be running on localhost:3000
        const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));
        const client = new Client({ name: "test", version: "1.0" }, { capabilities: {} });
        await client.connect(transport);
        console.log("Connected!");
        const tools = await client.listTools();
        console.log("Tools:", tools);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();