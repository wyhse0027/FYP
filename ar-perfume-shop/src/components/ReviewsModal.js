import React from 'react';
import { IoChevronBack } from 'react-icons/io5';

const ReviewsModal = ({ reviews, onClose }) => {
    return (
        // Full-screen overlay
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            {/* Modal Content */}
            <div className="bg-gray-800 text-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col p-6">
                <header className="flex items-center relative mb-4">
                    <button onClick={onClose} className="text-2xl absolute left-0">
                        <IoChevronBack />
                    </button>
                    <h2 className="text-xl font-bold w-full text-center">Reviews</h2>
                </header>
                
                <div className="overflow-y-auto">
                    {reviews.map((review, index) => (
                        <div key={index} className="border-b border-gray-700 py-4">
                            <div className="flex items-center mb-2">
                                <img src={review.avatar} alt={review.user} className="w-10 h-10 rounded-full mr-3" />
                                <span className="font-semibold">{review.user}</span>
                            </div>
                            <div className="flex mb-2">
                                {Array(5).fill(0).map((_, i) => (
                                    <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-500'}>★</span>
                                ))}
                            </div>
                            <p className="text-gray-300 mb-2">{review.comment}</p>
                            <p className="text-xs text-gray-500">{review.time}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReviewsModal;