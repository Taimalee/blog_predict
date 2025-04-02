"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Settings, Sparkles } from "lucide-react"

export default function EditorSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("predictions")
  const [useAdvancedModel, setUseAdvancedModel] = useState(true)
  const [creativityLevel, setCreativityLevel] = useState([0.7])
  const [autoComplete, setAutoComplete] = useState(true)

  return (
    <div className={`border-l bg-background transition-all duration-300 ${isOpen ? "w-80" : "w-12"}`}>
      <div className="flex h-12 items-center justify-between border-b px-4">
        {isOpen && <h3 className="font-medium">Settings</h3>}
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className={isOpen ? "" : "mx-auto"}>
          {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="predictions">
                <Sparkles className="mr-2 h-4 w-4" />
                Predictions
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="advanced-model">Advanced GPT Model</Label>
                    <p className="text-xs text-muted-foreground">Use our advanced model for better predictions</p>
                  </div>
                  <Switch id="advanced-model" checked={useAdvancedModel} onCheckedChange={setUseAdvancedModel} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="creativity">Creativity Level</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(creativityLevel[0] * 100)}%</span>
                  </div>
                  <Slider
                    id="creativity"
                    value={creativityLevel}
                    onValueChange={setCreativityLevel}
                    max={1}
                    step={0.01}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-complete">Auto-Complete</Label>
                    <p className="text-xs text-muted-foreground">Automatically complete sentences</p>
                  </div>
                  <Switch id="auto-complete" checked={autoComplete} onCheckedChange={setAutoComplete} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 w-8">
                      -
                    </Button>
                    <div className="flex h-8 flex-1 items-center justify-center rounded-md border">16px</div>
                    <Button variant="outline" size="sm" className="h-8 w-8">
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="justify-start">
                      Light
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      Dark
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="spell-check">Spell Check</Label>
                    <p className="text-xs text-muted-foreground">Check spelling as you type</p>
                  </div>
                  <Switch id="spell-check" defaultChecked />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

