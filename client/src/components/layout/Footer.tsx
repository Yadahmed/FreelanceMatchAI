export default function Footer() {
  return (
    <footer className="border-t border-gray-200 mt-8">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} FreelanceMatchAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
