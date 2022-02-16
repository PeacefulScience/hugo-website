require("dotenv").config() 
const { schedule } = require('@netlify/functions');
const axios = require('axios');

const handler = async function(event, context) {
  console.log("Received event:", event);
  return axios.post(process.env.BUILD_HOOK, "DAILY").then(
    function(results) {
      return {
        statusCode: 200,
      };
    }
  )
};

module.exports.handler = schedule("0 16 * * *", handler);