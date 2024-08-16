const express = require("express");
const ProductErrors = require("../common/errors");

const router = express.Router();
const ProductModel = require("../models/product");
const UserModel = require("../models/userModel");
const verifyToken = require("./user");

router.get("/", async (req, res) => {
  const products = await ProductModel.find({});

  res.json({ products });
});

router.post("/checkout", verifyToken, async (req, res) => {
  const { customerID, cartItems } = req.body;
  try {
    const user = await UserModel.findById(customerID);

    const productIDs = Object.keys(cartItems);
    const products = await ProductModel.find({ _id: { $in: productIDs } });

    if (!user) {
      return res.status(400).json({ type: ProductErrors.NO_USERS_FOUND });
    }
    if (products.length !== productIDs.length) {
      return res.status(400).json({ type: ProductErrors.NO_PRODUCT_FOUND });
    }

    let totalPrice = 0;
    for (const item in cartItems) {
      const product = products.find((product) => String(product._id) === item);
      if (!product) {
        return res.status(400).json({ type: ProductErrors.NO_PRODUCT_FOUND });
      }

      if (product.stockQuantity < cartItems[item]) {
        return res.status(400).json({ type: ProductErrors.NOT_ENOUGH_STOCK });
      }

      totalPrice += product.price * cartItems[item];
    }

    if (user.availableMoney < totalPrice) {
      return res.status(400).json({ type: ProductErrors.NO_AVAILABLE_MONEY });
    }

    user.availableMoney -= totalPrice;
    user.purchasedItems.push(...productIDs);

    await user.save();
    await ProductModel.updateMany(
      { _id: { $in: productIDs } },
      { $inc: { stockQuantity: -1 } }
    );

    res.json({ purchasedItems: user.purchasedItems });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/purchased-items/:customerID", verifyToken, async (req, res) => {
  const { customerID } = req.params;
  try {
    const user = await UserModel.findById(customerID);

    if (!user) {
      return res.status(400).json({ type: ProductErrors.NO_USERS_FOUND });
    }

    const products = await ProductModel.find({
      _id: { $in: user.purchasedItems },
    });

    res.json({ purchasedItems: products });
  } catch (error) {
    res.status(400).json({ type: ProductErrors.NO_USERS_FOUND });
  }
});

module.exports = router;
