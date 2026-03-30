const { DatabaseTools } = require('./dist/mcp/tools/integrations/DatabaseTools.js');
const fs = require('node:fs');
const path = require('node:path');

const OUTPUT_DIR = path.resolve(process.cwd(), 'docs');

const testCases = [
  {
    name: 'basic-select',
    sql: "select u.id,u.name,o.amount from users u join orders o on u.id=o.userid where u.isactive=1 and o.amount>100 order by o.createtime desc;",
    args: {
      indentSize: 2,
      uppercaseKeywords: true,
      formatSqlInStringLiterals: false,
      stringLiteralSqlIndentSize: 2,
    },
    outputFile: 'formatted-basic-select.sql',
  },
  {
    name: 'declare-dynamic-sql-no-inner-format',
    sql: "DECLARE @s1 VARCHAR(MAX)='SELECT STUFF((SELECT '','' + CAST(T.Id AS NVARCHAR) FROM Task T WHERE T.UserId=@Uid FOR XML PATH('''')),1,1,'''')'; SELECT @s1 AS DynamicSql;",
    args: {
      indentSize: 2,
      uppercaseKeywords: true,
      formatSqlInStringLiterals: false,
      stringLiteralSqlIndentSize: 2,
    },
    outputFile: 'formatted-dynamic-sql-no-inner.sql',
  },
  {
    name: 'declare-dynamic-sql-inner-format-indent-2',
    sql: "DECLARE @s1 VARCHAR(MAX)='SELECT STUFF((SELECT '','' + CAST(T.Id AS NVARCHAR) FROM Task T WHERE T.UserId=@Uid FOR XML PATH('''')),1,1,'''')'; SELECT @s1 AS DynamicSql;",
    args: {
      indentSize: 2,
      uppercaseKeywords: true,
      formatSqlInStringLiterals: true,
      stringLiteralSqlIndentSize: 2,
    },
    outputFile: 'formatted-dynamic-sql-inner-indent-2.sql',
  },
  {
    name: 'declare-dynamic-sql-inner-format-indent-4',
    sql: "DECLARE @s1 VARCHAR(MAX)='SELECT STUFF((SELECT '','' + CAST(T.Id AS NVARCHAR) FROM Task T WHERE T.UserId=@Uid FOR XML PATH('''')),1,1,'''')'; SELECT @s1 AS DynamicSql;",
    args: {
      indentSize: 2,
      uppercaseKeywords: true,
      formatSqlInStringLiterals: true,
      stringLiteralSqlIndentSize: 4,
    },
    outputFile: 'formatted-dynamic-sql-inner-indent-4.sql',
  },
  {
    name: 'lowercase-keywords-demo',
    sql: 'BEGIN DECLARE @Uid INT = 1001; IF EXISTS (SELECT 1 FROM Users WHERE Id = @Uid) BEGIN SELECT Id, Name FROM Users WHERE Id = @Uid; END END',
    args: {
      indentSize: 4,
      uppercaseKeywords: false,
      formatSqlInStringLiterals: false,
      stringLiteralSqlIndentSize: 2,
    },
    outputFile: 'formatted-lowercase-keywords.sql',
  },
];

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const tools = new DatabaseTools({
    execute: async () => {
      throw new Error('query_database is not used in run-format.js tests.');
    },
  });

  for (const testCase of testCases) {
    const outputPath = path.join('docs', testCase.outputFile);
    const result = await tools.callTool('format_sqlserver_sql', {
      sql: testCase.sql,
      ...testCase.args,
      outputPath,
    });

    if (!result || result.isError) {
      throw new Error(`Case failed: ${testCase.name}\n${JSON.stringify(result, null, 2)}`);
    }

    const fullOutputPath = path.resolve(process.cwd(), outputPath);
    const preview = String(result.structuredContent?.formattedSql ?? '')
      .split('\n')
      .slice(0, 6)
      .join('\n');

    console.log(`\n[OK] ${testCase.name}`);
    console.log(`saved: ${fullOutputPath}`);
    console.log('preview:');
    console.log(preview);
  }

  console.log(`\nDone. Generated ${testCases.length} formatted SQL files in: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('[run-format.js] Error:', error);
  process.exit(1);
});
