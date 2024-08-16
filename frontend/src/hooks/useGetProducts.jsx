// src/hooks/useGetProducts.js
import { useState, useEffect } from "react";
import { dummyProducts } from "../data/dummyproduct";

export const useGetProducts = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Simulate fetching data from an API
    setProducts(dummyProducts);
  }, []);

  return { products };
};
