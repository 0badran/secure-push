/**
 * Helper utility to demonstrate sample repository checks.
 * @param {string} repoName
 * @returns {Promise<{ status: string, timestamp: number }>}
 */
async function checkRepositoryHealth(repoName) {
  if (!repoName) {
    throw new Error("Repository name must be provided");
  }

  const timestamp = Date.now();
  console.log(`Checking health for repository: ${repoName} at ${timestamp}`);

  return {
    status: "healthy",
    timestamp,
  };
}

module.exports = {
  checkRepositoryHealth,
};
