const { MetalService } = require("./metal.service");

class MetalController {
  constructor() {
    this.service = new MetalService();
  }

  getPrices = async (req, res, next) => {
    try {
      const prices = await this.service.getMetalPrices();

      const baseUrl = `${req.protocol}://${req.get("host")}/public/metals`;

      const response = {
        "JEWELLERY 22K": {
          ...prices["JEWELLERY 22K"],
          image: `${baseUrl}/jewellery-22k.jpg`,
        },
        "JEWELLERY 24K": {
          ...prices["JEWELLERY 24K"],
          image: `${baseUrl}/jewellery-24k.jpg`,
        },
        "TEN TOLA BAR": {
          ...prices["TEN TOLA BAR"],
          image: `${baseUrl}/ten-tola.jpg`,
        },
        "KILO BAR 995": {
          ...prices["KILO BAR 995"],
          image: `${baseUrl}/kilo-995.jpg`,
        },
        "KILO BAR 9999": {
          ...prices["KILO BAR 9999"],
          image: `${baseUrl}/kilo-9999.jpg`,
        },
        "KILO BAR SILVER": {
          ...prices["KILO BAR SILVER"],
          image: `${baseUrl}/kilo-silver.jpg`,
        },
      };

      res.status(200).json({
        status: "success",
        data: response,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { MetalController };
