import { createClient } from '@clickhouse/client';

export const client = createClient({
  url: process.env.DATABASE_URL,
  database: process.env.CLICKHOUSE_DB || 'hauling_tracker',
  clickhouse_settings: {
    date_time_output_format: 'iso',
    output_format_json_quote_64bit_integers: 0,
  },
});

export async function query(sql, params = {}) {
  const result = await client.query({
    query: sql,
    query_params: params,
    format: 'JSONEachRow',
  });
  return result.json();
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function insert(table, values) {
  await client.insert({ table, values, format: 'JSONEachRow' });
}
