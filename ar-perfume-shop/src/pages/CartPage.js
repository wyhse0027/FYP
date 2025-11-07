import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { IoTrashOutline } from "react-icons/io5";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, itemCount, subtotal } =
    useCart();
  const navigate = useNavigate();
  const [itemToDelete, setItemToDelete] = useState(null);

  return (
    <>
      <div className="min-h-screen w-full bg-blue-900/95 px-6 md:px-12 lg:px-16 pb-48">
        <div className="mx-auto w-full max-w-screen-2xl py-6 text-[18px] md:text-[19px] lg:text-[20px]">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6">
            <PageHeader title="MY SHOPPING BAG" />

            {itemCount === 0 ? (
              <div className="flex items-center justify-center text-white h-48">
                Your cart is empty.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/15 rounded-xl p-4 flex items-center"
                  >
                    {/* Image */}
                    <div className="w-36 h-36 md:w-48 md:h-48 bg-black/10 rounded-lg mr-5 flex items-center justify-center overflow-hidden">
                      <img
                        src={
                          item.product?.card_image ||
                          item.product?.promo_image ||
                          "/placeholder.png"
                        }
                        alt={item.product?.name || "Product"}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-grow text-white">
                      <h2 className="font-bold text-2xl">
                        {item.product?.name || "Unnamed Product"}
                      </h2>
                      <p className="font-semibold text-xl mt-1">
                        RM{" "}
                        {(
                          parseFloat(item.product?.price || 0) * item.quantity
                        ).toFixed(2)}
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center mt-3">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity - 1, item.id)
                          }
                          className="bg-white/30 rounded w-8 h-8 text-lg leading-none"
                        >
                          −
                        </button>
                        <span className="mx-4 text-xl">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, item.quantity + 1, item.id)
                          }
                          className="bg-white/30 rounded w-8 h-8 text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() =>
                        setItemToDelete({
                          productId: item.product.id,
                          cartItemId: item.id,
                          name: item.product.name,
                        })
                      }
                      className="text-white text-3xl ml-4"
                    >
                      <IoTrashOutline />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 flex justify-center p-4">
        <div className="bg-white p-5 rounded-xl w-full max-w-screen-2xl">
          <div className="flex justify-between text-lg mb-4">
            <span>{itemCount} items</span>
            <span className="font-semibold">
              Subtotal: RM {subtotal.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => navigate("/checkout")}
            className="bg-blue-800 text-white w-full py-4 rounded-xl font-extrabold text-lg"
          >
            CHECKOUT
          </button>
        </div>
      </footer>

      {/* Confirmation dialog */}
      {itemToDelete && (
        <ConfirmationDialog
          item={itemToDelete}
          onConfirm={() => {
            removeFromCart(itemToDelete.productId, itemToDelete.cartItemId);
            setItemToDelete(null);
          }}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </>
  );
};

const ConfirmationDialog = ({ item, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg p-6 w-full max-w-sm text-center">
      <h2 className="text-lg font-bold mb-2">Remove Item?</h2>
      <p className="mb-6">
        Remove <span className="font-bold">{item.name || "this item"}</span> from your
        cart?
      </p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onCancel}
          className="border border-gray-300 py-2 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="bg-red-600 text-white py-2 rounded-lg"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
);

export default CartPage;
