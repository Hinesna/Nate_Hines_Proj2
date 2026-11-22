import serverless from "serverless-http";
import app from "../../server/app.js";

const serverlessHandler = serverless(app);

export const handler = async (event, context) => {
  // Keep the cached Mongo connection from holding the invocation open.
  context.callbackWaitsForEmptyEventLoop = false;
  return serverlessHandler(event, context);
};
