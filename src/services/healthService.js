const healthRepository = require("../repositories/healthRepository");

async function getDatabaseHealth() {
  return healthRepository.getDatabaseInfo();
}

module.exports = { getDatabaseHealth };
