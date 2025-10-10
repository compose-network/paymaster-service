import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";
import routes from "./routes";

async function app(
    instance: FastifyInstance,
    opts: FastifyServerOptions,
    done: () => void
) {
  try {
    // Register all routes through the main routes plugin
    await instance.register(routes, { prefix: "/" });

    // Call done without arguments
    done();
  } catch (error) {
    // Log the error but don't pass it to done
    console.error("Error in app setup:", error);
    throw error; // Let Fastify handle the error
  }
}

export default app;