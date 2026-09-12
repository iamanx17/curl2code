import { Tool } from "./types";
import { powershellToCode } from "./powershell-to-code";
import { webhookInspector } from "./webhook-inspector";
import { curlLanguageTools, curlToCode } from "./curl-to-code";
import { jsonFormatter } from "./json-formatter";
import { jsonValidator } from "./json-validator";
import { jsonDiff } from "./json-diff";
import { jsonToTypescript } from "./json-to-typescript";
import { jsonToZod } from "./json-to-zod";
import { jsonToPydantic } from "./json-to-pydantic";
import { jwtDecoder, jwtExpiryChecker } from "./jwt";
import { base64Tool, basicAuth, urlEncoder } from "./base64";
import { httpStatusCodes } from "./http-status-codes";
import { headerParser, queryStringParser, requestBuilder, responseFormatter, urlParser } from "./http-tools";
import { hmacGenerator, webhookFormatter, webhookSignature, webhookTester } from "./webhooks";
import { regexTester, timestampConverter, uuidGenerator } from "./utilities";
import { cronBuilder } from "./cron-builder";

export const TOOLS: Tool[] = [
  curlToCode,
  powershellToCode,
  webhookInspector,
  ...curlLanguageTools,

  jsonFormatter,
  jsonValidator,
  jsonDiff,
  jsonToTypescript,
  jsonToZod,
  jsonToPydantic,

  jwtDecoder,
  jwtExpiryChecker,
  base64Tool,
  urlEncoder,
  basicAuth,

  requestBuilder,
  httpStatusCodes,
  headerParser,
  urlParser,
  queryStringParser,
  responseFormatter,

  webhookFormatter,
  webhookSignature,
  hmacGenerator,
  webhookTester,

  uuidGenerator,
  regexTester,
  timestampConverter,
  cronBuilder,
];

export const getTool = (slug: string) => TOOLS.find((tool) => tool.slug === slug);

export const toolsByCategory = (category: string) =>
  TOOLS.filter((tool) => tool.category === category);

/**
 * The ten cURL language pages host the same converter, so counting slugs would
 * overstate how many distinct tools there are.
 */
export const TOOL_COUNT = TOOLS.length - curlLanguageTools.length;

export function relatedTools(tool: Tool, limit = 4) {
  const sameCategory = TOOLS.filter(
    (other) => other.slug !== tool.slug && other.category === tool.category,
  );

  const rest = TOOLS.filter(
    (other) => other.slug !== tool.slug && !sameCategory.includes(other),
  );

  return [...sameCategory, ...rest].slice(0, limit);
}
