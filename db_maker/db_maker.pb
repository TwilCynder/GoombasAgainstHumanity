OpenFile(0, "raw.txt");
CreateFile(1, "res.txt")
Define line.s

While Not Eof(0)
  line = ReadString(0)
  line = RemoveString(line, "“")
  line = RemoveString(line, "”")
  line = ReplaceString(line, "…", "____")
  line = ReplaceString(line, "...", "____")
  line = RemoveString(line, Chr(34))
  line = Chr(34) + line + Chr(34) + ","
  WriteStringN(1, line)
Wend


; IDE Options = PureBasic 5.72 (Windows - x64)
; CursorPosition = 9
; EnableXP