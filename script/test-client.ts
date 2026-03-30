import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function run() {
    try {
        console.log("Connecting to MCP server...");
        // the server must be running on localhost:3000
        const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"));
        const client = new Client({ name: "test", version: "1.0" }, { capabilities: {} });
        await client.connect(transport);
        console.log("Connected!");

        const sql = `SET NOCOUNT ON; DECLARE @Uid INT = 1001, @BatchId UNIQUEIDENTIFIER = NEWID(), @TotalAmount DECIMAL(18,2), @StatusMsg NVARCHAR(MAX), @CurDate DATETIME = GETDATE(); BEGIN TRANSACTION TryUpdate; BEGIN TRY IF EXISTS (SELECT 1 FROM Users u WITH(NOLOCK) WHERE u.Id = @Uid AND u.IsActive = 1 AND u.Email LIKE '%@company.com') BEGIN ;WITH UserOrders AS (SELECT o.Id, o.Amount, o.CreateTime, od.ProductId, p.CategoryId FROM Orders o INNER JOIN OrderDetails od ON o.Id = od.OrderId AND o.UserId = @Uid INNER JOIN Products p ON od.ProductId = p.Id WHERE o.Status IN (SELECT StatusId FROM Config c WHERE c.Key = 'ValidStatus') AND o.CreateTime > DATEADD(day, -30, @CurDate)) UPDATE o SET o.Processed = 1, o.BatchId = @BatchId, o.UpdateTime = @CurDate OUTPUT INSERTED.Amount INTO @TempTable OUTPUT SELECT @TotalAmount = SUM(Amount) FROM @TempTable; IF @TotalAmount > 5000 BEGIN DECLARE @CursorVar CURSOR; SET @CursorVar = CURSOR FAST_FORWARD FOR SELECT ProductId FROM OrderDetails WHERE OrderId IN (SELECT Id FROM Orders WHERE BatchId = @BatchId); OPEN @CursorVar; FETCH NEXT FROM @CursorVar INTO @Uid; WHILE @@FETCH_STATUS = 0 BEGIN UPDATE Products SET Stock = Stock - 1 WHERE Id = @Uid AND Stock > 0; FETCH NEXT FROM @CursorVar INTO @Uid; END CLOSE @CursorVar; DEALLOCATE @CursorVar; SET @StatusMsg = (SELECT TOP 1 CASE WHEN CategoryId = 1 THEN 'High Priority' WHEN CategoryId = 2 THEN 'Medium' ELSE 'Low' END FROM Products WHERE Id = (SELECT TOP 1 ProductId FROM OrderDetails WHERE OrderId = (SELECT TOP 1 Id FROM Orders WHERE BatchId = @BatchId))) END ELSE BEGIN ROLLBACK TRANSACTION TryUpdate; RAISERROR('Amount too low', 16, 1); RETURN; END END ELSE BEGIN ROLLBACK TRANSACTION TryUpdate; SELECT 'User Invalid' AS Result; RETURN; END COMMIT TRANSACTION TryUpdate; SELECT 'Success' AS Result, @TotalAmount AS Total, @StatusMsg AS Msg; END TRY BEGIN CATCH IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION TryUpdate; DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE(); EXEC dbo.usp_LogError @ErrMsg, @BatchId; SELECT 'Error' AS Result, @ErrMsg AS Detail; END CATCH`;

        console.log("\nCalling format_sqlserver_sql tool...");
        const result = await client.callTool({
            name: "format_sqlserver_sql",
            arguments: {
                sql: sql,
                indentSize: 2,
                uppercaseKeywords: true,
                outputPath: "./docs/formatted-query.sql"
            }
        });

        console.log("\nResult:");
        if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
            console.log((result.content[0] as any).text);
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
run();