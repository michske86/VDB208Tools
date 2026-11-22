Attribute VB_Name = "DashboardUI"
Option Explicit

Private Const DASHBOARD_SHEET As String = "Diestroyers Dashboard"

Public Sub InstalleerDiestroyersDashboard()
    Dim ws As Worksheet
    Set ws = GetOrCreateDashboard()

    With ws
        .Cells.Clear
        .Range("B2").value = "THE DIESTROYERS"
        .Range("B3").value = "VBA 2.0 - Dagstart & beheer"
        .Range("B5").value = "Gebruik deze twee hoofdknoppen voor de dagelijkse werking."
        .Range("B2").Font.Size = 28
        .Range("B2").Font.Bold = True
        .Range("B3").Font.Size = 18
        .Range("B3").Font.Bold = True
        .Range("B5").Font.Size = 12
        .Columns("B:H").ColumnWidth = 18
        .Rows("1:18").RowHeight = 24
    End With

    DeleteShape ws, "btnDagstart"
    DeleteShape ws, "btnWebsite"
    DeleteShape ws, "btnHome"
    DeleteShape ws, "btnTV"
    DeleteShape ws, "btnAdmin"
    DeleteShape ws, "btnControle"

    AddButton ws, "btnDagstart", "DAGSTART" & vbCrLf & "Importeren + verwerken + publiceren", "Diestroyers_DagstartAlles", 2, 7, 330, 78, RGB(190, 0, 0)
    AddButton ws, "btnWebsite", "WEBSITE UPDATEN" & vbCrLf & "Zonder nieuwe resultatenimport", "Diestroyers_AlleenWebsiteUpdaten", 2, 11, 330, 78, RGB(75, 75, 75)
    AddButton ws, "btnHome", "HOME", "Diestroyers_OpenHome", 7, 7, 150, 50, RGB(35, 35, 35)
    AddButton ws, "btnTV", "TV", "Diestroyers_OpenTV", 7, 10, 150, 50, RGB(35, 35, 35)
    AddButton ws, "btnAdmin", "ADMIN", "Diestroyers_OpenAdmin", 7, 13, 150, 50, RGB(35, 35, 35)
    AddButton ws, "btnControle", "CONTROLEER INSTALLATIE", "Diestroyers_ControleerInstallatie", 7, 16, 190, 50, RGB(35, 35, 35)

    ws.Activate
    MsgBox "Het Diestroyers Dashboard is geinstalleerd.", vbInformation, "The Diestroyers"
End Sub

Private Sub AddButton(ByVal ws As Worksheet, ByVal naam As String, ByVal tekst As String, ByVal macroNaam As String, ByVal kolom As Long, ByVal rij As Long, ByVal breedte As Double, ByVal hoogte As Double, ByVal kleur As Long)
    Dim shp As Shape
    Set shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, ws.Cells(rij, kolom).Left, ws.Cells(rij, kolom).Top, breedte, hoogte)
    With shp
        .name = naam
        .OnAction = macroNaam
        .Fill.ForeColor.RGB = kleur
        .Line.ForeColor.RGB = RGB(255, 255, 255)
        .Line.Transparency = 0.7
        .Shadow.Visible = msoTrue
        .Shadow.Transparency = 0.45
        On Error Resume Next
        .TextFrame2.TextRange.Text = tekst
        .TextFrame2.TextRange.Font.Size = 17
        .TextFrame2.TextRange.Font.Bold = msoTrue
        .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
        .TextFrame2.VerticalAnchor = msoAnchorMiddle
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        On Error GoTo 0
    End With
End Sub

Private Function GetOrCreateDashboard() As Worksheet
    On Error Resume Next
    Set GetOrCreateDashboard = ThisWorkbook.Worksheets(DASHBOARD_SHEET)
    On Error GoTo 0
    If GetOrCreateDashboard Is Nothing Then
        Set GetOrCreateDashboard = ThisWorkbook.Worksheets.Add(Before:=ThisWorkbook.Worksheets(1))
        GetOrCreateDashboard.name = DASHBOARD_SHEET
    End If
End Function

Private Sub DeleteShape(ByVal ws As Worksheet, ByVal naam As String)
    On Error Resume Next
    ws.Shapes(naam).Delete
    On Error GoTo 0
End Sub
