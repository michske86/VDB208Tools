Attribute VB_Name = "LocalPathResolver"
Option Explicit

' ============================================================
' THE DIESTROYERS - CENTRALE LOKALE PADRESOLVER
'
' ALLE modules gebruiken deze module voor bestandsacties.
' ThisWorkbook.Path mag dus een SharePoint-URL zijn.
' De resolver zoekt altijd de lokaal gesynchroniseerde OneDrive-map.
' ============================================================

Private mCachedProjectPath As String

Public Function LocalProjectPath() As String
    Dim workbookPath As String
    Dim relativePath As String
    Dim candidate As String
    Dim roots As Collection
    Dim root As Variant

    If Len(mCachedProjectPath) > 0 Then
        If LocalFolderExists(mCachedProjectPath) Then
            LocalProjectPath = mCachedProjectPath
            Exit Function
        End If
        mCachedProjectPath = ""
    End If

    workbookPath = Trim$(ThisWorkbook.path)

    If Not LocalIsWebPath(workbookPath) Then
        If LocalFolderExists(workbookPath) Then
            mCachedProjectPath = NormalizeLocalPath(workbookPath)
            LocalProjectPath = mCachedProjectPath
            Exit Function
        End If
    End If

    relativePath = LocalRelativePathFromSharePoint(workbookPath)
    Set roots = LocalOneDriveRoots()

    For Each root In roots
        If Len(relativePath) > 0 Then
            candidate = CStr(root) & Application.PathSeparator & relativePath
        Else
            candidate = CStr(root)
        End If

        candidate = NormalizeLocalPath(candidate)

        If LocalFolderExists(candidate) Then
            mCachedProjectPath = candidate
            LocalProjectPath = candidate
            Exit Function
        End If
    Next root

    Err.Raise vbObjectError + 7001, "LocalProjectPath", _
              "De lokale Diestroyers-map kon niet worden gevonden." & vbCrLf & vbCrLf & _
              "Excel-pad:" & vbCrLf & workbookPath & vbCrLf & vbCrLf & _
              "Verwacht lokaal pad:" & vbCrLf & _
              Environ$("USERPROFILE") & "\OneDrive - FNAC\Michiel\Diestroyers"
End Function

Public Function LocalAssetsPath() As String
    LocalAssetsPath = LocalProjectPath() & Application.PathSeparator & "assets"
End Function

Public Function LocalProjectFile(ByVal relativePath As String) As String
    relativePath = Replace(relativePath, "/", Application.PathSeparator)
    relativePath = Replace(relativePath, "\", Application.PathSeparator)

    Do While Left$(relativePath, 1) = Application.PathSeparator
        relativePath = Mid$(relativePath, 2)
    Loop

    LocalProjectFile = LocalProjectPath() & Application.PathSeparator & relativePath
End Function

Public Function LocalAssetsFile(ByVal fileName As String) As String
    LocalAssetsFile = LocalAssetsPath() & Application.PathSeparator & fileName
End Function


Public Function DiestroyersShopKey(ByVal value As Variant) As String
    Dim raw As String, digits As String, i As Long, ch As String
    raw = Trim$(CStr(value))
    For i = 1 To Len(raw)
        ch = Mid$(raw, i, 1)
        If ch >= "0" And ch <= "9" Then digits = digits & ch
    Next i
    If digits <> "" Then
        Do While Len(digits) > 1 And Left$(digits, 1) = "0"
            digits = Mid$(digits, 2)
        Loop
        DiestroyersShopKey = digits
    Else
        DiestroyersShopKey = LCase$(raw)
    End If
End Function

Public Function DiestroyersNumber(ByVal value As Variant) As Double
    Dim s As String, commaPos As Long, dotPos As Long, decimalPos As Long
    Dim negative As Boolean, digitsAfter As Long
    If IsError(value) Or IsEmpty(value) Or IsNull(value) Then Exit Function
    Select Case VarType(value)
        Case vbByte, vbInteger, vbLong, vbSingle, vbDouble, vbCurrency, vbDecimal
            DiestroyersNumber = CDbl(value)
            Exit Function
    End Select
    s = Trim$(CStr(value))
    s = Replace(s, Chr$(160), "")
    s = Replace(s, " ", "")
    s = Replace(s, "EUR", "", 1, -1, vbTextCompare)
    s = Replace(s, Chr$(128), "")
    s = Replace(s, "%", "")
    s = Replace(s, "'", "")
    If Len(s) >= 2 And Left$(s,1) = "(" And Right$(s,1) = ")" Then
        negative = True
        s = Mid$(s,2,Len(s)-2)
    End If
    If s = "" Or s = "-" Or s = "." Or s = "," Then Exit Function
    commaPos = InStrRev(s, ",")
    dotPos = InStrRev(s, ".")
    If commaPos > 0 And dotPos > 0 Then
        If commaPos > dotPos Then
            s = Replace(s, ".", "")
            s = Replace(s, ",", ".")
        Else
            s = Replace(s, ",", "")
        End If
    ElseIf commaPos > 0 Then
        digitsAfter = Len(s) - commaPos
        If digitsAfter <= 2 Or Left$(s,commaPos-1) = "0" Or Left$(s,commaPos-1) = "-0" Then
            s = Replace(s, ",", ".")
        Else
            s = Replace(s, ",", "")
        End If
    ElseIf dotPos > 0 Then
        digitsAfter = Len(s) - dotPos
        If digitsAfter = 3 And Left$(s,dotPos-1) <> "0" And Left$(s,dotPos-1) <> "-0" Then
            s = Replace(s, ".", "")
        End If
    End If
    If Left$(s,1) = "+" Then s = Mid$(s,2)
    DiestroyersNumber = Val(s)
    If negative Then DiestroyersNumber = -Abs(DiestroyersNumber)
End Function

Public Function DiestroyersPercentPoints(ByVal value As Variant) As Double
    DiestroyersPercentPoints = DiestroyersNumber(value)
    If DiestroyersPercentPoints <> 0 And Abs(DiestroyersPercentPoints) <= 1 Then
        DiestroyersPercentPoints = DiestroyersPercentPoints * 100
    End If
End Function

Public Function DiestroyersJsonNumber(ByVal value As Variant) As String
    Dim s As String
    s = Format$(DiestroyersNumber(value), "0.############################")
    s = Replace(s, Application.International(xlDecimalSeparator), ".")
    DiestroyersJsonNumber = s
End Function

Public Function LocalFolderExists(ByVal folderPath As String) As Boolean
    Dim fso As Object
    On Error GoTo Failed
    Set fso = CreateObject("Scripting.FileSystemObject")
    LocalFolderExists = fso.FolderExists(folderPath)
    Exit Function
Failed:
    LocalFolderExists = False
End Function

Public Function LocalFileExists(ByVal filePath As String) As Boolean
    Dim fso As Object
    On Error GoTo Failed
    Set fso = CreateObject("Scripting.FileSystemObject")
    LocalFileExists = fso.FileExists(filePath)
    Exit Function
Failed:
    LocalFileExists = False
End Function

Public Sub EnsureLocalAssetsFolder()
    Dim fso As Object
    Dim p As String

    p = LocalAssetsPath()
    Set fso = CreateObject("Scripting.FileSystemObject")

    If Not fso.FolderExists(p) Then fso.CreateFolder p
End Sub

Public Sub LocalWriteUtf8File(ByVal targetPath As String, ByVal content As String)
    Dim parentFolder As String
    Dim separatorPos As Long
    Dim tempPath As String
    Dim stm As Object
    Dim fso As Object
    Dim attempt As Long
    Dim lastNumber As Long
    Dim lastDescription As String

    separatorPos = InStrRev(targetPath, Application.PathSeparator)

    If separatorPos = 0 Then
        Err.Raise vbObjectError + 7010, "LocalWriteUtf8File", _
                  "Ongeldig doelpad:" & vbCrLf & targetPath
    End If

    parentFolder = Left$(targetPath, separatorPos - 1)

    If Not LocalFolderExists(parentFolder) Then
        Err.Raise vbObjectError + 7011, "LocalWriteUtf8File", _
                  "Doelmap bestaat niet:" & vbCrLf & parentFolder
    End If

    Set fso = CreateObject("Scripting.FileSystemObject")
    Randomize

    ' Schrijf eerst naar de echte lokale TEMP-map.
    ' ADODB.SaveToFile is daar veilig en schrijft correcte UTF-8 bytes.
    tempPath = Environ$("TEMP") & Application.PathSeparator & _
               "diestroyers_" & Format$(Now, "yyyymmdd_hhnnss") & "_" & _
               CStr(Int(Rnd() * 1000000)) & ".tmp"

    On Error GoTo WriteFailed

    Set stm = CreateObject("ADODB.Stream")

    With stm
        .Type = 2                 ' adTypeText
        .Charset = "utf-8"
        .Open
        .WriteText content
        .Position = 0
        .SaveToFile tempPath, 2   ' uitsluitend naar lokale TEMP
        .Close
    End With

    Set stm = Nothing

    ' Vervang daarna het doelbestand. OneDrive-locks worden opgevangen.
    For attempt = 1 To 12
        On Error Resume Next
        Err.Clear

        If fso.FileExists(targetPath) Then
            SetAttr targetPath, vbNormal
            Err.Clear
            fso.DeleteFile targetPath, True
        End If

        If Err.Number = 0 Then
            fso.CopyFile tempPath, targetPath, True
        End If

        If Err.Number = 0 And fso.FileExists(targetPath) Then
            On Error GoTo 0

            On Error Resume Next
            fso.DeleteFile tempPath, True
            On Error GoTo 0

            Exit Sub
        End If

        lastNumber = Err.Number
        lastDescription = Err.Description
        Err.Clear
        On Error GoTo 0

        LocalWait 0.4
    Next attempt

    On Error Resume Next
    If fso.FileExists(tempPath) Then fso.DeleteFile tempPath, True
    On Error GoTo 0

    Err.Raise vbObjectError + 7012, "LocalWriteUtf8File", _
              "Bestand kon niet worden vervangen:" & vbCrLf & targetPath & vbCrLf & vbCrLf & _
              "Laatste fout: " & CStr(lastNumber) & " - " & lastDescription

WriteFailed:
    lastNumber = Err.Number
    lastDescription = Err.Description

    On Error Resume Next
    If Not stm Is Nothing Then stm.Close
    If Not fso Is Nothing Then
        If Len(tempPath) > 0 Then
            If fso.FileExists(tempPath) Then fso.DeleteFile tempPath, True
        End If
    End If
    On Error GoTo 0

    Err.Raise vbObjectError + 7013, "LocalWriteUtf8File", _
              "UTF-8-bestand kon niet worden geschreven." & vbCrLf & _
              "Doelbestand:" & vbCrLf & targetPath & vbCrLf & vbCrLf & _
              "Fout: " & CStr(lastNumber) & " - " & lastDescription
End Sub

Public Function LocalReadUtf8File(ByVal filePath As String) As String
    Dim stm As Object

    If Not LocalFileExists(filePath) Then
        Err.Raise vbObjectError + 7020, "LocalReadUtf8File", _
                  "Bestand niet gevonden:" & vbCrLf & filePath
    End If

    Set stm = CreateObject("ADODB.Stream")
    With stm
        .Type = 2
        .Charset = "utf-8"
        .Open
        .LoadFromFile filePath
        LocalReadUtf8File = .ReadText(-1)
        .Close
        If Len(LocalReadUtf8File) > 0 Then
            If AscW(Left$(LocalReadUtf8File, 1)) = &HFEFF Then LocalReadUtf8File = Mid$(LocalReadUtf8File, 2)
        End If
    End With
End Function

Public Sub TestLokaleProjectpaden()
    Dim projectPath As String
    Dim assetsPath As String
    Dim testFile As String
    Dim fso As Object

    On Error GoTo Failed

    projectPath = LocalProjectPath()
    assetsPath = LocalAssetsPath()
    EnsureLocalAssetsFolder

    testFile = LocalAssetsFile("_diestroyers_padtest.tmp")
    LocalWriteUtf8File testFile, "OK " & Format$(Now, "yyyy-mm-dd hh:nn:ss")

    Set fso = CreateObject("Scripting.FileSystemObject")
    If fso.FileExists(testFile) Then fso.DeleteFile testFile, True

    MsgBox "Lokale padtest geslaagd." & vbCrLf & vbCrLf & _
           "Excel-pad:" & vbCrLf & ThisWorkbook.path & vbCrLf & vbCrLf & _
           "Lokaal projectpad:" & vbCrLf & projectPath & vbCrLf & vbCrLf & _
           "Assets-map:" & vbCrLf & assetsPath, _
           vbInformation, "The Diestroyers"
    Exit Sub

Failed:
    MsgBox "Lokale padtest mislukt." & vbCrLf & vbCrLf & _
           "Fout " & Err.Number & " in " & Err.Source & ":" & vbCrLf & _
           Err.Description, vbCritical, "The Diestroyers"
End Sub

Private Function LocalOneDriveRoots() As Collection
    Dim roots As New Collection
    Dim userProfile As String
    Dim fso As Object
    Dim userFolder As Object
    Dim subFolder As Object

    LocalAddRoot roots, Environ$("OneDriveCommercial")
    LocalAddRoot roots, Environ$("OneDrive")
    LocalAddRoot roots, Environ$("OneDriveConsumer")

    userProfile = Environ$("USERPROFILE")
    If Len(userProfile) > 0 Then
        LocalAddRoot roots, userProfile & "\OneDrive - FNAC"

        On Error Resume Next
        Set fso = CreateObject("Scripting.FileSystemObject")
        Set userFolder = fso.GetFolder(userProfile)

        If Err.Number = 0 Then
            For Each subFolder In userFolder.SubFolders
                If LCase$(Left$(subFolder.name, 8)) = "onedrive" Then
                    LocalAddRoot roots, subFolder.path
                End If
            Next subFolder
        End If
        Err.Clear
        On Error GoTo 0
    End If

    Set LocalOneDriveRoots = roots
End Function

Private Sub LocalAddRoot(ByVal roots As Collection, ByVal rootPath As String)
    Dim item As Variant
    Dim normalized As String

    normalized = NormalizeLocalPath(rootPath)
    If Len(normalized) = 0 Then Exit Sub
    If Not LocalFolderExists(normalized) Then Exit Sub

    For Each item In roots
        If LCase$(CStr(item)) = LCase$(normalized) Then Exit Sub
    Next item

    roots.Add normalized
End Sub

Private Function LocalRelativePathFromSharePoint(ByVal webPath As String) As String
    Dim markerPos As Long
    Dim result As String

    markerPos = InStr(1, webPath, "/Documents/", vbTextCompare)
    If markerPos > 0 Then
        result = Mid$(webPath, markerPos + Len("/Documents/"))
    Else
        markerPos = InStr(1, webPath, "/Shared Documents/", vbTextCompare)
        If markerPos > 0 Then
            result = Mid$(webPath, markerPos + Len("/Shared Documents/"))
        End If
    End If

    result = LocalUrlDecode(result)
    result = Replace(result, "/", Application.PathSeparator)
    result = Replace(result, "\", Application.PathSeparator)

    Do While Left$(result, 1) = Application.PathSeparator
        result = Mid$(result, 2)
    Loop

    LocalRelativePathFromSharePoint = result
End Function

Private Function NormalizeLocalPath(ByVal value As String) As String
    Dim result As String

    result = Trim$(value)
    result = Replace(result, "file:///", "")
    result = Replace(result, "/", Application.PathSeparator)
    result = Replace(result, "%20", " ")

    Do While Len(result) > 3 And Right$(result, 1) = Application.PathSeparator
        result = Left$(result, Len(result) - 1)
    Loop

    NormalizeLocalPath = result
End Function

Private Function LocalIsWebPath(ByVal value As String) As Boolean
    Dim lowerValue As String

    lowerValue = LCase$(Trim$(value))
    LocalIsWebPath = Left$(lowerValue, 7) = "http://" Or _
                     Left$(lowerValue, 8) = "https://" Or _
                     Left$(lowerValue, 8) = "file:///"
End Function

Private Function LocalUrlDecode(ByVal value As String) As String
    Dim i As Long
    Dim output As String
    Dim hexValue As String
    Dim ch As String

    i = 1
    Do While i <= Len(value)
        ch = Mid$(value, i, 1)

        If ch = "%" And i + 2 <= Len(value) Then
            hexValue = Mid$(value, i + 1, 2)
            If LocalIsHexPair(hexValue) Then
                output = output & Chr$(CLng("&H" & hexValue))
                i = i + 3
            Else
                output = output & ch
                i = i + 1
            End If
        ElseIf ch = "+" Then
            output = output & " "
            i = i + 1
        Else
            output = output & ch
            i = i + 1
        End If
    Loop

    LocalUrlDecode = output
End Function

Private Function LocalIsHexPair(ByVal value As String) As Boolean
    Dim i As Long
    Dim ch As String

    If Len(value) <> 2 Then Exit Function

    For i = 1 To 2
        ch = UCase$(Mid$(value, i, 1))
        If InStr(1, "0123456789ABCDEF", ch, vbBinaryCompare) = 0 Then Exit Function
    Next i

    LocalIsHexPair = True
End Function

Private Sub LocalWait(ByVal seconds As Double)
    Dim endTime As Double

    endTime = Timer + seconds
    If endTime >= 86400 Then
        Do While Timer > 10
            DoEvents
        Loop
        endTime = endTime - 86400
    End If

    Do While Timer < endTime
        DoEvents
    Loop
End Sub
