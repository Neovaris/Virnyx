import { buildApp } from "./app";

const start = async () => {
  const app = await buildApp();

  try {
    const PORT = Number(process.env.PORT) || 4000;

    await app.listen({
      port: PORT,
      host: "0.0.0.0",
    });

    console.log(`🚀 Server running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();