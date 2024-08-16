import { createContext, useEffect, useState } from "react";
import { useGetProducts } from "../hooks/useGetProducts";
import axios from "axios";
import { ProductErrors } from "../models/errors";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import { useGetToken } from "../hooks/useGetToken";

export const ShopContext = createContext(null);

export const ShopContextProvider = (props) => {
  const [cookies, setCookies] = useCookies(["access_token"]);
  const [cartItems, setCartItems] = useState({});
  const [availableMoney, setAvailableMoney] = useState(0);
  const [purchasedItems, setPurchaseItems] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(
    cookies.access_token !== null
  );

  const { products, fetchProducts } = useGetProducts();
  const { headers } = useGetToken();
  const navigate = useNavigate();

  const fetchAvailableMoney = async () => {
    const res = await axios.get(
      `http://localhost:3001/auth/available-money/${localStorage.getItem(
        "userID"
      )}`,
      { headers }
    );
    setAvailableMoney(res.data.availableMoney);
  };

  const fetchPurchasedItems = async () => {
    const res = await axios.get(
      `http://localhost:3001/products/purchased-items/${localStorage.getItem(
        "userID"
      )}`,
      { headers }
    );

    setPurchaseItems(res.data.purchasedItems);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAvailableMoney();
      fetchPurchasedItems();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.clear();
      setCookies("access_token", null);
    }
  }, [isAuthenticated]);

  const getCartItemCount = (itemId) => {
    if (itemId in cartItems) {
      return cartItems[itemId];
    }
    return 0;
  };

  const getTotalCartAmount = () => {
    if (products.length === 0) return 0;

    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        const itemInfo = products.find((product) => product._id === item);
        totalAmount += cartItems[item] * itemInfo.price;
      }
    }
    return Number(totalAmount.toFixed(2));
  };

  const addToCart = (itemId) => {
    if (!cartItems[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }
  };

  const removeFromCart = (itemId) => {
    if (!cartItems[itemId]) return;
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
  };

  const updateCartItemCount = (newAmount, itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: newAmount }));
  };

  const checkout = async () => {
    const body = { customerID: localStorage.getItem("userID"), cartItems };
    try {
      const res = await axios.post(
        "http://localhost:3001/products/checkout",
        body,
        { headers }
      );
      setPurchaseItems(res.data.purchasedItems);
      fetchAvailableMoney();
      fetchProducts();
      navigate("/");
    } catch (err) {
      let errorMessage = "";
      switch (err.response.data.type) {
        case ProductErrors.NO_PRODUCT_FOUND:
          errorMessage = "No product found";
          break;
        case ProductErrors.NO_AVAILABLE_MONEY:
          errorMessage = "Not enough money";
          break;
        case ProductErrors.NOT_ENOUGH_STOCK:
          errorMessage = "Not enough stock";
          break;
        default:
          errorMessage = "Something went wrong";
      }

      alert("ERROR: " + errorMessage);
    }
  };

  const contextValue = {
    getCartItemCount,
    addToCart,
    updateCartItemCount,
    removeFromCart,
    getTotalCartAmount,
    checkout,
    availableMoney,
    fetchAvailableMoney,
    purchasedItems,
    isAuthenticated,
    setIsAuthenticated,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};
