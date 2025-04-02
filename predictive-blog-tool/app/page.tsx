import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Write Better Blogs</h1>
          <p className="text-muted-foreground md:text-xl">
            Our AI-powered tool helps you write engaging blog posts with smart predictions.
          </p>
        </div>
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
          <Button asChild size="lg" className="flex-1">
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="flex-1">
            <Link href="/login?tab=signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

