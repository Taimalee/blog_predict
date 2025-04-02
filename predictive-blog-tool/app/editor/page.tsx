"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import EditorSidebar from "@/components/editor-sidebar"
import { Save, Send } from "lucide-react"

export default function EditorPage() {
  const [title, setTitle] = useState("Untitled Post")
  const [content, setContent] = useState("")
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 })
  const [showPredictions, setShowPredictions] = useState(false)
  const [predictions, setPredictions] = useState(["continue", "further", "with", "your", "thoughts"])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update cursor position when content changes
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      const cursorPos = textarea.selectionEnd

      // Create a mirror div to calculate position
      const mirror = document.createElement("div")
      mirror.style.position = "absolute"
      mirror.style.top = "0"
      mirror.style.left = "0"
      mirror.style.visibility = "hidden"
      mirror.style.whiteSpace = "pre-wrap"
      mirror.style.wordWrap = "break-word"
      mirror.style.width = `${textarea.offsetWidth}px`
      mirror.style.font = window.getComputedStyle(textarea).font
      mirror.style.padding = window.getComputedStyle(textarea).padding

      // Get text up to cursor
      const textBeforeCursor = content.substring(0, cursorPos)

      // Create a span for the text before cursor
      const textNode = document.createTextNode(textBeforeCursor)
      mirror.appendChild(textNode)

      // Add a marker at cursor position
      const marker = document.createElement("span")
      marker.id = "cursor-marker"
      mirror.appendChild(marker)

      document.body.appendChild(mirror)

      // Get position of marker
      const markerRect = marker.getBoundingClientRect()
      const textareaRect = textarea.getBoundingClientRect()

      // Calculate position relative to textarea
      const top = markerRect.top - textareaRect.top + textarea.scrollTop + 24 // Add line height
      const left = markerRect.left - textareaRect.left

      setCursorPosition({ top, left })

      // Clean up
      document.body.removeChild(mirror)

      // Show predictions if there's content
      setShowPredictions(content.length > 0)
    }
  }, [content])

  const handlePredictionClick = (word: string) => {
    setContent(content + " " + word)
    setShowPredictions(false)
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold border-none px-0 text-3xl focus-visible:ring-0"
              placeholder="Post Title"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>

          <div className="relative min-h-[500px]">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your blog post..."
              className="min-h-[500px] resize-none text-lg leading-relaxed p-4 focus-visible:ring-1"
            />

            {showPredictions && (
              <Card
                className="absolute z-10 p-1 flex flex-wrap gap-1 shadow-md bg-background border"
                style={{
                  top: `${cursorPosition.top}px`,
                  left: `${cursorPosition.left}px`,
                  maxWidth: "300px",
                }}
              >
                {predictions.map((word, index) => (
                  <Button
                    key={index}
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handlePredictionClick(word)}
                  >
                    {word}
                  </Button>
                ))}
              </Card>
            )}
          </div>
        </div>

        <EditorSidebar />
      </div>
    </DashboardLayout>
  )
}

