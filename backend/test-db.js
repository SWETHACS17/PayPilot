const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    try {
        console.log("Attempting to connect to database...");
        await prisma.$connect();
        console.log("Successfully connected to database!");

        // Try a simple query
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log("Query result:", result);

        await prisma.$disconnect();
    } catch (error) {
        console.error("Connection failed:");
        console.error(error);
        process.exit(1);
    }
}

main();
