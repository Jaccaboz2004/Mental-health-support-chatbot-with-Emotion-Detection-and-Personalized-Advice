with open("test_out2.txt", "r", encoding="utf-16le") as f:
    print(f.read().encode("utf-8", "ignore").decode("utf-8"))
