Attribute VB_Name = "AdminSync"
Option Explicit

Private mAdminSyncSucceeded As Boolean

' ============================================================
' THE DIESTROYERS - ADMIN CONFIG SYNC FIXED
'
' Wat deze module doet:
' 1. Leest assets\config-data.js.
' 2. Synchroniseert Instellingen, District, Verkopers en Targets.
' 3. Past daarna de targetkolommen in Resultaten aan voor ALLE bestaande maanden.
'
' Belangrijk:
' - Dit lost het probleem op waarbij historische pagina's zoals
'   verkoper.html?id=17975&periode=2026-04 geen targets tonen.
' - De XLSM blijft bron voor resultaten; config-data.js is bron voor configuratie.
' ============================================================

Public Sub SynchroniseerAdminConfiguratie()
    Dim path As String
    Dim txt As String
    Dim json As String

    On Error GoTo Fout
    mAdminSyncSucceeded = False

    path = LocalAssetsFile("config-data.js")
    If Len(path) = 0 Then Exit Sub

    txt = LocalReadUtf8File(path)
    json = ExtractJsonAdmin(txt)
    If Len(json) < 10 Then
        MsgBox "config-data.js werd gevonden, maar bevat geen leesbaar JSON-object." & vbCrLf & _
               "Controleer of het bestand begint met:" & vbCrLf & _
               "window.DIESTROYERS_CONFIG_DATA = {" & vbCrLf & vbCrLf & _
               "Pad: " & path, vbExclamation, "The Diestroyers"
        Exit Sub
    End If

    ValidateAdminConfigJson json

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    ImportAdminShop json
    ImportAdminDistrict json
    ImportAdminVerkopers json
    ImportAdminTargets json
    ApplyTargetsToResultaten

    ' Configuratie is leidend: verwijder actuele resultaatrijen van niet-actieve verkopers.
    On Error Resume Next
    Application.Run "OpschonenInactieveVerkopersActuelePeriode"
    Application.Run "HerberekenSResultatenActuelePeriode"
    On Error GoTo Fout

    SchrijfAdminSyncVersie json

    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    mAdminSyncSucceeded = True
    Exit Sub

Fout:
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "Admin configuratie synchroniseren mislukt." & vbCrLf & vbCrLf & _
           "Fout " & Err.Number & " in " & Err.Source & ":" & vbCrLf & _
           Err.Description, vbCritical, "The Diestroyers"
End Sub

Public Sub SynchroniseerAdminConfiguratieMetMelding()
    SynchroniseerAdminConfiguratie
    If mAdminSyncSucceeded Then
        MsgBox "Adminconfiguratie is gesynchroniseerd.", vbInformation, "The Diestroyers"
    End If
End Sub

Public Sub AdminConfiguratieImporterenEnWebsiteBijwerken()
    SynchroniseerAdminConfiguratie
    On Error Resume Next
    Application.Run "WebsiteBijwerken"
    On Error GoTo 0
End Sub


Public Function AdminSyncIsGeslaagd() As Boolean
    AdminSyncIsGeslaagd = mAdminSyncSucceeded
End Function

Private Sub ValidateAdminConfigJson(ByVal json As String)
    Dim districtRows As Collection, sellerRows As Collection, targetRows As Collection
    Dim shopObj As String
    shopObj = JsonObjectByKey(json, "shop")
    If Trim$(JsonValue(shopObj, "shopNr")) = "" Then Err.Raise vbObjectError + 7301, "ValidateAdminConfigJson", "Winkelnummer ontbreekt in config-data.js."
    Set districtRows = JsonArrayObjects(json, "district")
    Set sellerRows = JsonArrayObjects(json, "verkopers")
    Set targetRows = JsonArrayObjects(json, "targets")
    If districtRows.Count = 0 Then Err.Raise vbObjectError + 7302, "ValidateAdminConfigJson", "Geen districtwinkels gevonden in config-data.js."
    If sellerRows.Count = 0 Then Err.Raise vbObjectError + 7303, "ValidateAdminConfigJson", "Geen verkopers gevonden in config-data.js."
    If targetRows.Count = 0 Then Err.Raise vbObjectError + 7304, "ValidateAdminConfigJson", "Geen targets gevonden in config-data.js."
End Sub

Public Sub ApplyTargetsToResultaten()
    Dim tblR As ListObject, tblT As ListObject
    Dim r As ListRow, t As ListRow, best As ListRow
    Dim periode As String, entiteitType As String, naam As String, shopNr As String
    Dim targetCols As Variant, c As Variant
    Dim score As Long, bestScore As Long
    Dim tShop As String

    On Error GoTo Fout

    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    Set tblT = ThisWorkbook.Worksheets("Targets").ListObjects("Targets")

    targetCols = Array("OmzetTarget", "LifeTarget", "InsuranceTargetPct", "AboTargetPct", "DSPTargetPct", _
                       "SPGTargetPct", "SRPTargetPct", "AccessoiresTargetPct", "NPSTarget", "LinkTargetPct", "MonsterTarget")

    For Each r In tblR.ListRows
        periode = NormaliseerAdminPeriode(GetCellAdmin(tblR, r, "Periode"))
        entiteitType = LCase(Trim(CStr(GetCellAdmin(tblR, r, "EntiteitType"))))
        naam = LCase(Trim(CStr(GetCellAdmin(tblR, r, "Naam"))))
        shopNr = Trim(CStr(GetCellAdmin(tblR, r, "ShopNr")))

        Set best = Nothing
        bestScore = -1

        For Each t In tblT.ListRows
            If NormaliseerAdminPeriode(GetCellAdmin(tblT, t, "Periode")) = periode _
            And LCase(Trim(CStr(GetCellAdmin(tblT, t, "EntiteitType")))) = entiteitType _
            And LCase(Trim(CStr(GetCellAdmin(tblT, t, "Naam")))) = naam Then

                score = TargetRowScoreAdmin(tblT, t, targetCols)
                tShop = Trim(CStr(GetCellAdmin(tblT, t, "ShopNr")))

                If shopNr <> "" And DiestroyersShopKey(tShop) = DiestroyersShopKey(shopNr) Then score = score + 100
                If score > bestScore Then
                    bestScore = score
                    Set best = t
                End If
            End If
        Next t

        If Not best Is Nothing Then
            For Each c In targetCols
                If HasColumnAdmin(tblR, CStr(c)) And HasColumnAdmin(tblT, CStr(c)) Then
                    SetCellAdmin tblR, r, CStr(c), GetCellAdmin(tblT, best, CStr(c))
                End If
            Next c
        End If
    Next r

    Exit Sub

Fout:
    Err.Raise Err.Number, "ApplyTargetsToResultaten - " & Err.Source, Err.Description
End Sub

Private Function TargetRowScoreAdmin(ByVal tbl As ListObject, ByVal r As ListRow, ByVal cols As Variant) As Long
    Dim c As Variant
    Dim v As Variant

    For Each c In cols
        v = GetCellAdmin(tbl, r, CStr(c))
        If IsNumeric(v) Then
            If CDbl(v) <> 0 Then TargetRowScoreAdmin = TargetRowScoreAdmin + 1
        ElseIf Trim(CStr(v)) <> "" Then
            TargetRowScoreAdmin = TargetRowScoreAdmin + 1
        End If
    Next c
End Function

Private Function NormaliseerAdminPeriode(ByVal v As Variant) As String
    If IsDate(v) Then
        NormaliseerAdminPeriode = Format(CDate(v), "yyyy-mm")
    Else
        NormaliseerAdminPeriode = Left$(Trim(CStr(v)), 7)
    End If
End Function

Private Sub ImportAdminShop(ByVal json As String)
    Dim shopObj As String, shopNr As String, naam As String
    shopObj = JsonObjectByKey(json, "shop")
    shopNr = JsonValue(shopObj, "shopNr")
    naam = JsonValue(shopObj, "naam")

    If shopNr <> "" Then
        SetSettingAdmin "Winkelnummer", shopNr
        SetSettingAdmin "shopNr", shopNr
    End If

    If naam <> "" Then
        SetSettingAdmin "WinkelNaam", naam
        SetSettingAdmin "winkelNaam", naam
    End If
End Sub

Private Sub ImportAdminDistrict(ByVal json As String)
    Dim arr As Collection, obj As Variant
    Dim ws As Worksheet, tbl As ListObject, r As ListRow

    Set ws = GetOrCreateSheetAdmin("District")
    Set tbl = EnsureTableAdmin(ws, "District", Array("ShopNr", "Winkel", "Regio", "Actief"))

    ClearTableAdmin tbl
    Set arr = JsonArrayObjects(json, "district")

    For Each obj In arr
        Set r = tbl.ListRows.Add
        SetCellAdmin tbl, r, "ShopNr", JsonValue(CStr(obj), "ShopNr")
        SetCellAdmin tbl, r, "Winkel", JsonValue(CStr(obj), "Winkel")
        SetCellAdmin tbl, r, "Regio", NzText(JsonValue(CStr(obj), "Regio"), "Regio")
        SetCellAdmin tbl, r, "Actief", NzText(JsonValue(CStr(obj), "Actief"), "JA")
    Next obj
End Sub

Private Sub ImportAdminVerkopers(ByVal json As String)
    Dim arr As Collection, obj As Variant
    Dim ws As Worksheet, tbl As ListObject, r As ListRow
    Dim shopNr As String

    shopNr = JsonValue(JsonObjectByKey(json, "shop"), "shopNr")

    Set ws = GetOrCreateSheetAdmin("Verkopers")
    Set tbl = EnsureTableAdmin(ws, "Verkopers", Array("Naam", "Avatar", "Actief", "Startdatum", "Functie", "ShopNr", "PersoneelsNr", "ImportAlias"))

    ClearTableAdmin tbl
    Set arr = JsonArrayObjects(json, "verkopers")

    For Each obj In arr
        Set r = tbl.ListRows.Add
        SetCellAdmin tbl, r, "Naam", JsonValue(CStr(obj), "Naam")
        SetCellAdmin tbl, r, "Avatar", JsonValue(CStr(obj), "Avatar")
        SetCellAdmin tbl, r, "Actief", NzText(JsonValue(CStr(obj), "Actief"), "Ja")
        SetCellAdmin tbl, r, "Startdatum", JsonValue(CStr(obj), "Startdatum")
        SetCellAdmin tbl, r, "Functie", JsonValue(CStr(obj), "Functie")
        SetCellAdmin tbl, r, "ShopNr", NzText(JsonValue(CStr(obj), "ShopNr"), shopNr)
        SetCellAdmin tbl, r, "PersoneelsNr", JsonValue(CStr(obj), "PersoneelsNr")
        SetCellAdmin tbl, r, "ImportAlias", JsonValue(CStr(obj), "ImportAlias")
    Next obj
End Sub

Private Sub ImportAdminTargets(ByVal json As String)
    Dim arr As Collection, obj As Variant, c As Variant
    Dim ws As Worksheet, tbl As ListObject, r As ListRow
    Dim cols As Variant

    cols = Array("Periode", "EntiteitType", "Naam", "ShopNr", "OmzetTarget", "LifeTarget", "InsuranceTargetPct", _
                 "AboTargetPct", "DSPTargetPct", "SPGTargetPct", "SRPTargetPct", _
                 "AccessoiresTargetPct", "NPSTarget", "LinkTargetPct", "MonsterTarget")

    Set ws = GetOrCreateSheetAdmin("Targets")
    Set tbl = EnsureTableAdmin(ws, "Targets", cols)

    ClearTableAdmin tbl
    Set arr = JsonArrayObjects(json, "targets")

    For Each obj In arr
        Set r = tbl.ListRows.Add
        For Each c In cols
            SetCellAdmin tbl, r, CStr(c), JsonValue(CStr(obj), CStr(c))
        Next c
    Next obj
End Sub

Private Sub SchrijfAdminSyncVersie(ByVal json As String)
    Dim version As String
    version = JsonValue(json, "version")
    If version <> "" Then SetSettingAdmin "adminConfigVersion", version
End Sub

Private Sub SetSettingAdmin(ByVal eigenschap As String, ByVal waarde As String)
    Dim ws As Worksheet, tbl As ListObject, r As ListRow

    Set ws = GetOrCreateSheetAdmin("Instellingen")
    Set tbl = EnsureTableAdmin(ws, "Instellingen", Array("Eigenschap", "Waarde"))

    For Each r In tbl.ListRows
        If LCase(Trim(CStr(GetCellAdmin(tbl, r, "Eigenschap")))) = LCase(eigenschap) Then
            SetCellAdmin tbl, r, "Waarde", waarde
            Exit Sub
        End If
    Next r

    Set r = tbl.ListRows.Add
    SetCellAdmin tbl, r, "Eigenschap", eigenschap
    SetCellAdmin tbl, r, "Waarde", waarde
End Sub


 ' ---------------- Lokale padhelpers ----------------

Private Function GetAdminConfigDataPath() As String
    GetAdminConfigDataPath = LocalAssetsFile("config-data.js")
End Function

Public Sub TestAdminSyncPad()
    Dim configPath As String

    On Error GoTo Fout

    configPath = LocalAssetsFile("config-data.js")

    MsgBox "Excel-pad:" & vbCrLf & ThisWorkbook.path & vbCrLf & vbCrLf & _
           "Lokaal projectpad:" & vbCrLf & LocalProjectPath() & vbCrLf & vbCrLf & _
           "Configuratiebestand:" & vbCrLf & configPath & vbCrLf & vbCrLf & _
           "Bestand gevonden: " & IIf(LocalFileExists(configPath), "JA", "NEE"), _
           vbInformation, "The Diestroyers"
    Exit Sub

Fout:
    MsgBox "Padcontrole mislukt." & vbCrLf & vbCrLf & _
           "Fout " & Err.Number & " in " & Err.Source & ":" & vbCrLf & _
           Err.Description, vbCritical, "The Diestroyers"
End Sub

' ---------------- JSON helpers ----------------

Private Function ExtractJsonAdmin(ByVal txt As String) As String
    Dim startPos As Long
    Dim i As Long
    Dim depth As Long
    Dim inString As Boolean
    Dim escaped As Boolean
    Dim ch As String

    ' Verwijder eventueel UTF-8 BOM.
    If Len(txt) > 0 Then
        If AscW(Left$(txt, 1)) = &HFEFF Then txt = Mid$(txt, 2)
    End If

    ' Zoek het eerste JSON-object. Dit werkt ook wanneer de JS-regel
    ' window.DIESTROYERS_CONFIG_DATA = ... anders geformatteerd is.
    startPos = InStr(1, txt, "{", vbBinaryCompare)
    If startPos = 0 Then Exit Function

    For i = startPos To Len(txt)
        ch = Mid$(txt, i, 1)

        If escaped Then
            escaped = False
        ElseIf ch = "\" Then
            If inString Then escaped = True
        ElseIf ch = """" Then
            inString = Not inString
        ElseIf Not inString Then
            If ch = "{" Then
                depth = depth + 1
            ElseIf ch = "}" Then
                depth = depth - 1

                If depth = 0 Then
                    ExtractJsonAdmin = Mid$(txt, startPos, i - startPos + 1)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Private Function JsonObjectByKey(ByVal json As String, ByVal key As String) As String
    Dim p As Long, startObj As Long, i As Long, depth As Long, ch As String
    p = InStr(1, json, """" & key & """", vbTextCompare)
    If p = 0 Then Exit Function
    startObj = InStr(p, json, "{")
    If startObj = 0 Then Exit Function

    For i = startObj To Len(json)
        ch = Mid$(json, i, 1)
        If ch = "{" Then depth = depth + 1
        If ch = "}" Then
            depth = depth - 1
            If depth = 0 Then
                JsonObjectByKey = Mid$(json, startObj, i - startObj + 1)
                Exit Function
            End If
        End If
    Next i
End Function

Private Function JsonArrayObjects(ByVal json As String, ByVal key As String) As Collection
    Dim out As New Collection
    Dim p As Long, startArr As Long, i As Long, depth As Long, ch As String
    Dim arrText As String, objStart As Long

    p = InStr(1, json, """" & key & """", vbTextCompare)
    If p = 0 Then Set JsonArrayObjects = out: Exit Function

    startArr = InStr(p, json, "[")
    If startArr = 0 Then Set JsonArrayObjects = out: Exit Function

    For i = startArr To Len(json)
        ch = Mid$(json, i, 1)
        If ch = "[" Then depth = depth + 1
        If ch = "]" Then
            depth = depth - 1
            If depth = 0 Then
                arrText = Mid$(json, startArr + 1, i - startArr - 1)
                Exit For
            End If
        End If
    Next i

    depth = 0
    objStart = 0
    For i = 1 To Len(arrText)
        ch = Mid$(arrText, i, 1)
        If ch = "{" Then
            If depth = 0 Then objStart = i
            depth = depth + 1
        ElseIf ch = "}" Then
            depth = depth - 1
            If depth = 0 And objStart > 0 Then
                out.Add Mid$(arrText, objStart, i - objStart + 1)
                objStart = 0
            End If
        End If
    Next i

    Set JsonArrayObjects = out
End Function

Private Function JsonValue(ByVal obj As String, ByVal key As String) As String
    Dim re As Object, m As Object
    Set re = CreateObject("VBScript.RegExp")
    re.Pattern = """" & key & """\s*:\s*(""([^""]*)""|[-]?[0-9]+(\.[0-9]+)?|true|false|null)"
    re.IgnoreCase = True
    re.Global = False

    If re.Test(obj) Then
        Set m = re.Execute(obj)(0)
        JsonValue = m.SubMatches(0)
        If Left$(JsonValue, 1) = """" And Right$(JsonValue, 1) = """" Then
            JsonValue = Mid$(JsonValue, 2, Len(JsonValue) - 2)
        End If
        JsonValue = Replace(JsonValue, "\""", """")
    Else
        JsonValue = ""
    End If
End Function

' ---------------- Excel helpers ----------------

Private Function ReadTextFileAdmin(ByVal path As String) As String
    Dim stm As Object

    On Error GoTo fallback

    ' config-data.js wordt door de adminpagina als UTF-8 opgeslagen.
    Set stm = CreateObject("ADODB.Stream")

    With stm
        .Type = 2                 ' adTypeText
        .Charset = "utf-8"
        .Open
        .LoadFromFile path
        ReadTextFileAdmin = .ReadText(-1)
        .Close
    End With

    Exit Function

fallback:
    On Error Resume Next

    If Not stm Is Nothing Then stm.Close

    Dim fso As Object
    Dim ts As Object

    Set fso = CreateObject("Scripting.FileSystemObject")

    ' Fallback voor oudere UTF-16-configbestanden.
    Set ts = fso.OpenTextFile(path, 1, False, -1)

    If Err.Number = 0 Then
        ReadTextFileAdmin = ts.ReadAll
        ts.Close
    Else
        Err.Clear

        ' Laatste fallback: systeemtekenset.
        Set ts = fso.OpenTextFile(path, 1, False, 0)
        ReadTextFileAdmin = ts.ReadAll
        ts.Close
    End If

    On Error GoTo 0
End Function

Private Function GetOrCreateSheetAdmin(ByVal sheetName As String) As Worksheet
    On Error Resume Next
    Set GetOrCreateSheetAdmin = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0

    If GetOrCreateSheetAdmin Is Nothing Then
        Set GetOrCreateSheetAdmin = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        GetOrCreateSheetAdmin.name = sheetName
    End If
End Function

Private Function EnsureTableAdmin(ByVal ws As Worksheet, ByVal tableName As String, ByVal cols As Variant) As ListObject
    Dim tbl As ListObject
    Dim i As Long

    On Error Resume Next
    Set tbl = ws.ListObjects(tableName)
    On Error GoTo 0

    If tbl Is Nothing Then
        ws.Cells.Clear
        For i = LBound(cols) To UBound(cols)
            ws.Cells(1, i + 1).value = cols(i)
        Next i
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(2, UBound(cols) + 1)), , xlYes)
        tbl.name = tableName
    Else
        For i = LBound(cols) To UBound(cols)
            If Not HasColumnAdmin(tbl, CStr(cols(i))) Then tbl.ListColumns.Add.name = CStr(cols(i))
        Next i
    End If

    Set EnsureTableAdmin = tbl
End Function

Private Function HasColumnAdmin(ByVal tbl As ListObject, ByVal colName As String) As Boolean
    On Error GoTo Geen
    HasColumnAdmin = Not tbl.ListColumns(colName) Is Nothing
    Exit Function
Geen:
    HasColumnAdmin = False
End Function

Private Sub ClearTableAdmin(ByVal tbl As ListObject)
    Do While tbl.ListRows.Count > 0
        tbl.ListRows(1).Delete
    Loop
End Sub

Private Sub SetCellAdmin(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String, ByVal value As Variant)
    On Error Resume Next
    If LCase$(colName) = "shopnr" Or LCase$(colName) = "personeelsnr" Then r.Range.Cells(1, tbl.ListColumns(colName).Index).NumberFormat = "@"
    r.Range.Cells(1, tbl.ListColumns(colName).Index).Value = value
End Sub

Private Function GetCellAdmin(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo Fout
    GetCellAdmin = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Fout:
    GetCellAdmin = ""
End Function

Private Function NzText(ByVal value As String, ByVal fallback As String) As String
    If Trim(value) = "" Then NzText = fallback Else NzText = value
End Function
