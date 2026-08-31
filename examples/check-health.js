/**
 * Helper utility to demonstrate sample repository health checks.
 * @param {string} repoName
 * @returns {Promise<{ status: string, timestamp: number, uptimeSeconds: number }>}
 */
async function checkRepositoryHealth(repoName) {
  if (!repoName) {
    throw new Error("Repository name must be provided");
  }

  // Simulate an async health verification check
  await new Promise((resolve) => setTimeout(resolve, 50));

  const timestamp = Date.now();
  console.log(`Checking health for repository: ${repoName} at ${timestamp}`);

  return {
    status: "healthy",
    timestamp,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

module.exports = {
  checkRepositoryHealth,
};
