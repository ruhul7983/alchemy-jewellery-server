const axios = require("axios");
const {
  GOLD_PURITY,
  TOLA_IN_GRAM,
  KG_IN_GRAM,
} = require("./metal.constants");

class MetalService {
  async getMetalPrices() {
    const { data } = await axios.get(
      "https://api.metalpriceapi.com/v1/latest",
      {
        params: {
          api_key: process.env.METAL_API_KEY,
          base: "AED",
          currencies: "XAU,XAG",
        },
      }
    );

    const goldPerGram = (1 / data.rates.XAU) / 31.1035;
    const silverPerGram = (1 / data.rates.XAG) / 31.1035;

    return {
      "JEWELLERY 22K": {
        weight: "1 GM",
        price: +(goldPerGram * GOLD_PURITY.JEWELLERY_22K).toFixed(2),
      },
      "JEWELLERY 24K": {
        weight: "1 GM",
        price: +(goldPerGram * GOLD_PURITY.JEWELLERY_24K).toFixed(2),
      },
      "TEN TOLA BAR": {
        weight: "10 TOLA",
        price: +(goldPerGram * TOLA_IN_GRAM * 10).toFixed(2),
      },
      "KILO BAR 995": {
        weight: "1 KG",
        price: +(goldPerGram * KG_IN_GRAM * GOLD_PURITY.KILO_995).toFixed(2),
      },
      "KILO BAR 9999": {
        weight: "1 KG",
        price: +(goldPerGram * KG_IN_GRAM * GOLD_PURITY.KILO_9999).toFixed(2),
      },
      "KILO BAR SILVER": {
        weight: "1 KG",
        price: +(silverPerGram * KG_IN_GRAM).toFixed(2),
      },
    };
  }
}

module.exports = { MetalService };
