import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/use-auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, MessageSquare, User, Settings, LogOut, BrainCircuit, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/utils';

export function Header() {
  const { currentUser, isAuthenticated, isClient, isFreelancer, signOut } = useAuth();
  const [location] = useLocation();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!currentUser) return 'G';
    if (currentUser.displayName) {
      return currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return currentUser.username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2 group">
            <BrainCircuit className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
            <span className="font-bold text-xl font-display tracking-tight transition-colors group-hover:text-primary">KurdJobs AI</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className={cn(
            "text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-transform after:bg-primary after:duration-300",
            location === "/" ? "text-primary font-semibold after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
          )}>
            Home
          </Link>
          <Link href="/explore-freelancers" className={cn(
            "text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-transform after:bg-primary after:duration-300",
            location === "/explore-freelancers" ? "text-primary font-semibold after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
          )}>
            Explore Freelancers
          </Link>
          <Link href="/about" className={cn(
            "text-sm font-medium transition-colors hover:text-primary relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-transform after:bg-primary after:duration-300",
            location === "/about" ? "text-primary font-semibold after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"
          )}>
            How It Works
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          <div className="relative hidden md:block">
            <input
              type="search"
              placeholder="Search freelancers..."
              className="w-[200px] bg-background h-9 rounded-full border pl-9 pr-4 text-sm focus-visible:ring-1 focus-visible:ring-primary transition-all focus-visible:w-[240px]"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent/50 transition-colors">
                  <Avatar className="h-8 w-8 border-2 border-primary/10">
                    <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || currentUser?.username} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-flex font-medium">{currentUser?.displayName || currentUser?.username}</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/40 shadow-lg animate-fade-in">
                <DropdownMenuLabel className="font-display text-base">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="mb-1" />
                
                {isFreelancer ? (
                  // For freelancers, show a single combined profile option
                  <DropdownMenuItem className="cursor-pointer rounded-lg transition-colors focus:bg-accent/80 hover:bg-accent/80 my-1" asChild>
                    <Link href="/freelancer-profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-primary/80" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  // For clients and others, show the standard profile option
                  <DropdownMenuItem className="cursor-pointer rounded-lg transition-colors focus:bg-accent/80 hover:bg-accent/80 my-1" asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-primary/80" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem className="cursor-pointer rounded-lg transition-colors focus:bg-accent/80 hover:bg-accent/80 my-1" asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-primary/80" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                {/* AI Diagnostic Tool - Only for admin users */}
                {currentUser?.isAdmin && (
                  <DropdownMenuItem className="cursor-pointer rounded-lg transition-colors focus:bg-accent/80 hover:bg-accent/80 my-1" asChild>
                    <Link href="/direct-chat" className="flex items-center">
                      <BrainCircuit className="mr-2 h-4 w-4 text-primary/80" />
                      <span>AI Diagnostic Tool</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator className="my-1" />
                
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive rounded-lg transition-colors focus:bg-destructive/10 hover:bg-destructive/10 my-1" 
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <AuthModal triggerButton={
                <Button className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300 font-medium px-6 rounded-full">
                  <span className="animate-pulse-gentle">Get Started</span>
                </Button>
              } />
            </>
          )}
        </div>
      </div>
    </header>
  );
}