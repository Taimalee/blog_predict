import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import { CalendarDays, FileText, PenLine, Plus } from "lucide-react"

export default function Dashboard() {
  const recentDrafts = [
    { id: 1, title: "The Future of AI in Content Creation", date: "2 days ago", wordCount: 1250 },
    { id: 2, title: "10 Tips for Better Blog Writing", date: "1 week ago", wordCount: 850 },
    { id: 3, title: "How to Engage Your Audience", date: "2 weeks ago", wordCount: 1100 },
  ]

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Start writing or continue with your drafts.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Start Writing</CardTitle>
              <CardDescription>Create a new blog post</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex h-24 items-center justify-center rounded-md border-2 border-dashed">
                <PenLine className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/editor">
                  <Plus className="mr-2 h-4 w-4" /> New Post
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Your writing stats</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex h-24 items-center justify-around">
                <div className="text-center">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">3.2k</p>
                  <p className="text-xs text-muted-foreground">Words</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" /> View All Posts
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Drafts</CardTitle>
            <CardDescription>Continue where you left off</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDrafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <h3 className="font-medium">{draft.title}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <CalendarDays className="mr-1 h-3 w-3" />
                      <span>{draft.date}</span>
                      <span className="mx-2">•</span>
                      <span>{draft.wordCount} words</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/editor?id=${draft.id}`}>Continue</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

