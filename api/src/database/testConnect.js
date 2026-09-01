const connect = require("./connect");

module.exports = async function testConnect() {
  while(true){    
    try {
      const connection = await connect.getConnection();
      connection.release();
      console.log("Successful connection");
      return;
    } catch (error) {
      console.log("Database unavailable. Retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
