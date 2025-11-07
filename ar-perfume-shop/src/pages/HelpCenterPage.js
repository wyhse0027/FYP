import React from 'react';
import PageHeader from '../components/PageHeader';

const faqs = [
  { q:'Shipping times?', a:'Orders ship within 1–2 business days. MY/SG delivery usually 2–5 working days.' },
  { q:'Returns & exchanges?', a:'Unopened items within 14 days. Contact support to arrange a return label.' },
  { q:'Are your perfumes unisex?', a:'Yes. We describe mood & notes, not gender rules. Wear what you like.' },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen w-full bg-[#0c1a3a] px-6 md:px-10 lg:px-16">
      <div className="mx-auto w-full max-w-[900px] py-8 text-white">
        <PageHeader title="Help Center" />
        <div className="bg-white/5 rounded-2xl p-6">
          {faqs.map((f, i) => (
            <details key={i} className="group border-b border-white/10 py-4">
              <summary className="cursor-pointer text-lg font-semibold list-none flex justify-between items-center">
                <span>{f.q}</span>
                <span className="text-white/60 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="text-white/80 mt-2">{f.a}</p>
            </details>
          ))}
          <div className="mt-6 text-white/80">
            Still need help? Email <span className="underline">support@gerainchan.example</span>.
          </div>
        </div>
      </div>
    </div>
  );
}
