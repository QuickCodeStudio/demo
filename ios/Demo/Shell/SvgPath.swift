import SwiftUI

enum SvgPath {
    static func parse(_ source: String) -> Path {
        var path = Path()
        let tokens = tokenize(source)
        var index = 0
        var x: CGFloat = 0
        var y: CGFloat = 0

        func number() -> CGFloat {
            guard index < tokens.count else { return 0 }
            let value = CGFloat(Double(tokens[index]) ?? 0)
            index += 1
            return value
        }

        var command = ""
        while index < tokens.count {
            if tokens[index].unicodeScalars.allSatisfy({ CharacterSet.letters.contains($0) }) {
                command = tokens[index]
                index += 1
            } else if command == "M" {
                command = "L"
            }
            switch command {
            case "M", "L":
                x = number()
                y = number()
                if command == "M" {
                    path.move(to: CGPoint(x: x, y: y))
                } else {
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            case "H":
                x = number()
                path.addLine(to: CGPoint(x: x, y: y))
            case "V":
                y = number()
                path.addLine(to: CGPoint(x: x, y: y))
            case "Q":
                let control = CGPoint(x: number(), y: number())
                x = number()
                y = number()
                path.addQuadCurve(to: CGPoint(x: x, y: y), control: control)
            case "C":
                let c1 = CGPoint(x: number(), y: number())
                let c2 = CGPoint(x: number(), y: number())
                x = number()
                y = number()
                path.addCurve(to: CGPoint(x: x, y: y), control1: c1, control2: c2)
            case "Z":
                path.closeSubpath()
            default:
                break
            }
        }
        return path
    }

    private static func tokenize(_ source: String) -> [String] {
        var tokens: [String] = []
        var number = ""
        func flushNumber() {
            if !number.isEmpty {
                tokens.append(number)
                number = ""
            }
        }
        for character in source {
            if character.isLetter {
                flushNumber()
                tokens.append(String(character))
            } else if character == "," || character.isWhitespace {
                flushNumber()
            } else {
                number.append(character)
            }
        }
        flushNumber()
        return tokens
    }
}

struct QcTraceShape: Shape {
    var source: String

    func path(in rect: CGRect) -> Path {
        let raw = SvgPath.parse(source)
        let scale = min(rect.width / 947, rect.height / 586)
        return raw.applying(CGAffineTransform(scaleX: scale, y: scale))
    }
}
