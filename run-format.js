const {DatabaseTools} = require('./dist/mcp/tools/integrations/DatabaseTools.js');
const fs = require('fs');
const path = require('path');

const tools = new DatabaseTools(null);
const sql = `CREATE PROCEDURE [dbo].[usp_FixQuoteTest] @Id INT AS BEGIN SET NOCOUNT ON; DECLARE @S1 NVARCHAR(MAX) = 'SELECT STUFF((SELECT '','' + CAST(T.Id AS NVARCHAR) FROM (SELECT TOP 5 Id FROM Config WHERE Active = 1) AS T FOR XML PATH(''''), TYPE).value(''.'', ''NVARCHAR(MAX)''), 1, 1, '''')', @S2 NVARCHAR(MAX) = N'SELECT ''Test''', @Result INT; BEGIN TRY SELECT @Result = COUNT(*) FROM Users WHERE Id IN (SELECT Id FROM Config); EXEC sp_executesql @S1; END TRY BEGIN CATCH SELECT ERROR_MESSAGE(); END CATCH END`;
tools.callTool('format_sqlserver_sql', {
  sql,
  indentSize: 2,
  uppercaseKeywords: true,
  outputPath: './docs/formatted-query1.sql'
}).then(result => {
  console.log(result.content[0].text);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
