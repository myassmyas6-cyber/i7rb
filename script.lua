-- I7RB Key System Script
local SERVER = "https://i7rb-production.up.railway.app"
local HS = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local function showError(msg)
    local g = Instance.new("ScreenGui"); g.Name="I7RBDeny"; g.ResetOnSpawn=false; g.Parent=game.CoreGui
    local f = Instance.new("Frame",g); f.Size=UDim2.new(0,300,0,65); f.Position=UDim2.new(0.5,-150,0.5,-32)
    f.BackgroundColor3=Color3.fromRGB(20,0,0); Instance.new("UICorner",f).CornerRadius=UDim.new(0,9)
    local t = Instance.new("TextLabel",f); t.Size=UDim2.new(1,0,1,0)
    t.Text="I7RB - "..msg; t.TextColor3=Color3.fromRGB(255,80,80)
    t.BackgroundTransparency=1; t.Font=Enum.Font.GothamBold; t.TextScaled=true
    task.delay(4,function() g:Destroy() end)
end

local reqFunc = syn and syn.request
    or (typeof(http_request)=="function" and http_request)
    or (http and http.request)
    or (typeof(request)=="function" and request)
    or fluxus_request or nil

if not reqFunc then showError("الاكسبلويت ما يدعم HTTP"); return end

local KeyGui = Instance.new("ScreenGui")
KeyGui.Name="I7RBKey"; KeyGui.ResetOnSpawn=false
KeyGui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling; KeyGui.Parent=game.CoreGui

local BG = Instance.new("Frame",KeyGui)
BG.Size=UDim2.new(0,320,0,160); BG.Position=UDim2.new(0.5,-160,0.5,-80)
BG.BackgroundColor3=Color3.fromRGB(15,15,15); BG.BorderSizePixel=0
Instance.new("UICorner",BG).CornerRadius=UDim.new(0,10)
local Stroke=Instance.new("UIStroke",BG)
Stroke.Color=Color3.fromRGB(0,200,100); Stroke.Thickness=1.5

local TitleLbl=Instance.new("TextLabel",BG)
TitleLbl.Size=UDim2.new(1,0,0,36
