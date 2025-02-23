
export function Card({ children, className, ...props }) {
  return (
    <div 
      className={`
        bg-gradient-to-r from-white to-gray-50 
        rounded-xl 
        border border-gray-200
        shadow-md 
        hover:shadow-xl 
        transition-all 
        duration-300 
        ${className}
      `} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={`p-4 border-b border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={`text-xl font-semibold text-gray-800 ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={`p-4 text-gray-600 ${className}`} {...props}>
      {children}
    </div>
  );
}