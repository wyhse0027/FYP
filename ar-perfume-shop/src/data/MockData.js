// === PRODUCT BOTTLE IMAGES ===
import productEleganza from '../assets/images/product-eleganza.png';
import productEleganzaIntense from '../assets/images/product-eleganza-intense.jpg';
import productProjectK from '../assets/images/product-project-k.png';

// === PROMO IMAGES ===
import promoEleganza from '../assets/images/promo-eleganza.png';
import promoEleganzaIntense from '../assets/images/promo-eleganza-intense.png';
import promoProjectK from '../assets/images/promo-project-k.png';

// === CART IMAGES ===
import cartEleganza from '../assets/images/cart-eleganza.jpg';
import cartEleganzaIntense from '../assets/images/cart-eleganza-intense.jpg';
import cartProjectK from '../assets/images/cart-project-k.jpg';

// === VIDEO THUMBNAILS ===
import videoThumbEleganza from '../assets/images/video-thumb-eleganza.png';
import videoThumbEleganzaIntense from '../assets/images/video-thumb-eleganza-intense.png';
import videoThumbProjectK from '../assets/images/video-thumb-project-k.png';


export const products = [
    { 
        id: 1, 
        name: 'ELEGANZA', 
        category: 'Fresh', 
        price: '199.90', 
        image: productEleganza,
        cartImage: cartEleganza, // <-- Added this line
        images: [ // Array of images for the product page slider
            promoEleganza,
            videoThumbEleganza,
        ],
        tags: ['150 ml', 'Fresh-Balanced', 'Unisex', 'Long Lasting'],
        description: 'ELEGANZA is a bold yet refined Eau de Parfum, crafted for those who exude confidence and seek elegance in every moment. Opening with a crisp blend of apple, mandarin, and a splash of iced water, the fragrance transitions into a fresh and airy heart of ozonic leaves, jasmine, and juniper berry. It settles into a warm, sensual base of...',
        reviews: [
            { user: 'User 1', avatar: 'https://i.pravatar.cc/150?u=user1', rating: 5, comment: 'Smells amazing and lasts all day! Elegant scent that’s perfect for any occasion.', time: '14 hours ago' },
            { user: 'User 2', avatar: 'https://i.pravatar.cc/150?u=user2', rating: 4, comment: 'Nice everyday perfume. Light, fresh, and not too strong. Great for work or casual outings.', time: '1 week ago' },
            { user: 'User 3', avatar: 'https://i.pravatar.cc/150?u=user3', rating: 5, comment: 'Eleganza is my new favorite! Clean, classy scent that makes me feel confident all day.', time: '2 weeks ago' },
            { user: 'User 4', avatar: 'https://i.pravatar.cc/150?u=user4', rating: 4, comment: 'Good value for the price. The bottle design is also very nice.', time: '1 month ago' },
        ]
    },
    { 
        id: 2, 
        name: 'ELEGANZA INTENSE', 
        category: 'Bold', 
        price: '209.90', 
        image: productEleganzaIntense,
        cartImage: cartEleganzaIntense, // <-- Added this line
        images: [
            promoEleganzaIntense,
            videoThumbEleganzaIntense,
        ],
        tags: ['100 ml', 'Woody-Spicy', 'Masculine', 'Evening Wear'],
        description: 'An intense and captivating interpretation of the original, ELEGANZA INTENSE is designed for the modern man. It opens with invigorating notes of bergamot and black pepper, leading to a heart of rich lavender and patchouli. The base is a powerful blend of amber, vetiver, and warm tonka bean, leaving a lasting impression of sophistication.',
        reviews: [
            { user: 'User 1', avatar: 'https://i.pravatar.cc/150?u=user5', rating: 5, comment: 'Absolutely powerful scent. Perfect for a night out. Lasts forever!', time: '3 days ago' },
            { user: 'User 2', avatar: 'https://i.pravatar.cc/150?u=user6', rating: 5, comment: 'This is my signature scent now. I get asked what I\'m wearing all the time. 10/10.', time: '2 weeks ago' },
        ]
    },
    { 
        id: 3, 
        name: 'PROJECT K', 
        category: 'Bold', 
        price: '229.90', 
        image: productProjectK,
        cartImage: cartProjectK, // <-- Added this line
        images: [
            promoProjectK,
            videoThumbProjectK,
        ],
        tags: ['120 ml', 'Oriental-Gourmand', 'Unisex', 'Unique'],
        description: 'PROJECT K is an enigmatic and luxurious fragrance that defies convention. Top notes of saffron and jasmine create a radiant opening, while the heart combines the warmth of cedarwood with a sweet praline accord. The scent concludes with a mysterious and lingering base of oakmoss and ambergris, creating a truly unforgettable olfactory experience.',
        reviews: [
            { user: 'User 1', avatar: 'https://i.pravatar.cc/150?u=user7', rating: 5, comment: 'There is nothing else like this. It\'s so unique and addictive. Worth every penny.', time: '1 day ago' },
            { user: 'User 2', avatar: 'https://i.pravatar.cc/150?u=user8', rating: 4, comment: 'Very interesting and complex scent. It\'s not for everyone, but I love how different it is.', time: '5 days ago' },
            { user: 'User 3', avatar: 'https://i.pravatar.cc/150?u=user9', rating: 5, comment: 'A masterpiece. The perfect balance of sweet and woody notes. Lasts all day and gets lots of compliments.', time: '3 weeks ago' },
        ]
    },
];

// This updates the releases page automatically
export const releases = [
    { id: 1, title: 'ELEGANZA', image: promoEleganza },
    { id: 2, title: 'ELEGANZA INTENSE', image: promoEleganzaIntense },
    { id: 3, title: 'PROJECT K', image: promoProjectK },
];