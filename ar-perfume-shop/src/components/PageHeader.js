import { useNavigate } from 'react-router-dom';
import { IoChevronBack } from 'react-icons/io5';

export default function PageHeader({
  title,
  right = null,
  showBack = true,
  className = '',
  onBack,
}) {
  const navigate = useNavigate();
  const goBack = onBack || (() => navigate(-1));

  return (
    <header className={`relative flex items-center text-white mb-8 ${className}`}>
      {showBack && (
        <button
          onClick={goBack}
          className="text-3xl md:text-4xl absolute left-0 leading-none"
          aria-label="Go back"
          title="Back"
        >
          <IoChevronBack />
        </button>
      )}
      {title && (
        <h1 className="mx-auto font-bold tracking-wide text-2xl md:text-3xl lg:text-4xl">
          {title}
        </h1>
      )}
      {right && <div className="absolute right-0 text-2xl md:text-3xl">{right}</div>}
    </header>
  );
}
