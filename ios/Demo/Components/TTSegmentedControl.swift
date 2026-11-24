//
//  TTSegmentedControl.swift
//  Adapted from freytz_ios Utils — same API, no FreytzTheme dependency.
//

import UIKit

@IBDesignable
open class TTSegmentedControl: UIView {

    private let segment = UISegmentedControl(items: [])

    @IBInspectable open var defaultTextFont: UIFont = UIFont.systemFont(ofSize: 12, weight: .semibold) {
        didSet { applyTitleFonts() }
    }
    @IBInspectable open var selectedTextFont: UIFont = UIFont.systemFont(ofSize: 12, weight: .bold) {
        didSet { applyTitleFonts() }
    }
    @IBInspectable open var defaultTextColor: UIColor = UIColor(white: 0.38, alpha: 1) {
        didSet { applyTitleFonts() }
    }
    @IBInspectable open var selectedTextColor: UIColor = .white {
        didSet { applyTitleFonts() }
    }
    @IBInspectable open var useGradient: Bool = false
    @IBInspectable open var containerBackgroundColor: UIColor = UIColor(red: 0.93, green: 0.93, blue: 0.94, alpha: 1) {
        didSet { applyChrome() }
    }
    @IBInspectable open var thumbColor: UIColor = UIColor(red: 0.22, green: 0.48, blue: 0.96, alpha: 1) {
        didSet { applyChrome() }
    }
    @IBInspectable open var thumbGradientColors: [UIColor]?
    @IBInspectable open var thumbShadowColor: UIColor = .lightGray
    @IBInspectable open var useShadow: Bool = false
    @IBInspectable open var padding: CGSize = .zero
    @IBInspectable open var cornerRadius: CGFloat = 0 {
        didSet {
            layer.cornerRadius = cornerRadius
            applyChrome()
        }
    }
    @IBInspectable open var borderWidth: CGFloat = 0 {
        didSet { layer.borderWidth = borderWidth }
    }
    @IBInspectable open var borderColor: UIColor? {
        didSet { layer.borderColor = borderColor?.cgColor }
    }

    open var animationOptions: BounceOptions = BounceOptions()
    open var hasBounceAnimation: Bool = false
    public struct BounceOptions {
        var springDamping: CGFloat = 0.7
        var springInitialVelocity: CGFloat = 0.2
        var options: UIView.AnimationOptions = .curveEaseInOut
    }

    private var _itemTitles: [String] = []
    open var itemTitles: [String] {
        get { _itemTitles }
        set {
            _itemTitles = newValue
            rebuildSegments()
        }
    }

    open var didSelectItemWith: ((_ index: Int, _ title: String?) -> ())?

    open var allowDrag = false
    open var allowChangeThumbWidth = false
    open var noItemSelected: Bool = false {
        didSet {
            if noItemSelected { segment.selectedSegmentIndex = UISegmentedControl.noSegment }
        }
    }

    open var currentIndex: Int {
        let idx = segment.selectedSegmentIndex
        return max(0, idx == UISegmentedControl.noSegment ? 0 : idx)
    }

    private var isRebuilding = false

    public override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        clipsToBounds = true
        if cornerRadius == 0 { cornerRadius = 8 }
        clearOuterBorder()
        segment.layer.cornerRadius = max(0, cornerRadius - 1)

        segment.translatesAutoresizingMaskIntoConstraints = false
        segment.addTarget(self, action: #selector(handleValueChanged), for: .valueChanged)
        addSubview(segment)
        NSLayoutConstraint.activate([
            segment.leadingAnchor.constraint(equalTo: leadingAnchor),
            segment.trailingAnchor.constraint(equalTo: trailingAnchor),
            segment.topAnchor.constraint(equalTo: topAnchor),
            segment.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
        applyChrome()
        applyTitleFonts()
    }

    open override func awakeFromNib() {
        super.awakeFromNib()
        clearOuterBorder()
        applyChrome()
        applyTitleFonts()
    }

    private func clearOuterBorder() {
        borderWidth = 0
        borderColor = nil
        layer.borderWidth = 0
        layer.borderColor = UIColor.clear.cgColor
        segment.layer.borderWidth = 0
        segment.layer.borderColor = UIColor.clear.cgColor
    }

    open override func prepareForInterfaceBuilder() {
        super.prepareForInterfaceBuilder()
        if itemTitles.isEmpty {
            itemTitles = ["Item1", "Item2"]
        }
        applyChrome()
        applyTitleFonts()
    }

    private func rebuildSegments() {
        isRebuilding = true
        let previous = segment.selectedSegmentIndex
        segment.removeAllSegments()
        for (i, title) in _itemTitles.enumerated() {
            segment.insertSegment(withTitle: title, at: i, animated: false)
        }
        if !_itemTitles.isEmpty {
            let idx = (previous == UISegmentedControl.noSegment) ? 0 : min(max(0, previous), _itemTitles.count - 1)
            segment.selectedSegmentIndex = idx
        }
        isRebuilding = false
        applyTitleFonts()
        applyChrome()
    }

    private func applyTitleFonts() {
        let normal: [NSAttributedString.Key: Any] = [
            .font: defaultTextFont,
            .foregroundColor: defaultTextColor
        ]
        let selected: [NSAttributedString.Key: Any] = [
            .font: selectedTextFont,
            .foregroundColor: selectedTextColor
        ]
        segment.setTitleTextAttributes(normal, for: .normal)
        segment.setTitleTextAttributes(selected, for: .selected)
        segment.setTitleTextAttributes(selected, for: .highlighted)
    }

    private func applyChrome() {
        segment.selectedSegmentTintColor = thumbColor
        // Clear track lets SwiftUI glass chrome show through.
        let clearTrack = containerBackgroundColor.cgColor.alpha < 0.05
        segment.backgroundColor = clearTrack ? .clear : containerBackgroundColor
        backgroundColor = clearTrack ? .clear : containerBackgroundColor
        isOpaque = !clearTrack
        let radius = max(cornerRadius, layer.cornerRadius, 8)
        if abs(cornerRadius - radius) > 0.5 {
            cornerRadius = radius
        }
        layer.cornerRadius = radius
        clipsToBounds = true
        layer.masksToBounds = true
        segment.layer.cornerRadius = max(0, radius - 1)
        segment.clipsToBounds = true
        layer.cornerCurve = .continuous
        segment.layer.cornerCurve = .continuous
        isAccessibilityElement = false
        segment.isAccessibilityElement = true
        segment.accessibilityTraits = .adjustable
        segment.accessibilityLabel = _itemTitles.isEmpty ? "Status" : _itemTitles.joined(separator: ", ")
        segment.accessibilityValue = {
            let idx = segment.selectedSegmentIndex
            guard idx >= 0, idx < _itemTitles.count else { return nil }
            return _itemTitles[idx]
        }()
    }

    @objc private func handleValueChanged() {
        guard !isRebuilding else { return }
        let index = currentIndex
        let title = (index < _itemTitles.count) ? _itemTitles[index] : segment.titleForSegment(at: index)
        didSelectItemWith?(index, title)
    }

    open func selectItemAt(index: Int, animated: Bool = false) {
        guard segment.numberOfSegments > 0 else { return }
        let clamped = min(max(0, index), segment.numberOfSegments - 1)
        segment.selectedSegmentIndex = clamped
        if animated {
            UIView.transition(with: segment, duration: 0.15, options: .transitionCrossDissolve, animations: nil)
        }
    }

    open func changeTitle(_ title: String, atIndex: Int) {
        guard atIndex >= 0, atIndex < segment.numberOfSegments else { return }
        segment.setTitle(title, forSegmentAt: atIndex)
        if atIndex < _itemTitles.count {
            _itemTitles[atIndex] = title
        }
    }

    open func changeAttributedTitle(_ title: NSAttributedString, selectedTile: NSAttributedString?, atIndex: Int) {
        changeTitle(title.string, atIndex: atIndex)
    }

    open func titleForItemAtIndex(_ index: Int) -> String {
        segment.titleForSegment(at: index) ?? ""
    }

    open func attributedTitleAtIndex(_ index: Int) -> (normal: NSAttributedString, selected: NSAttributedString) {
        let text = segment.titleForSegment(at: index) ?? ""
        return (
            normal: NSAttributedString(string: text, attributes: [.font: defaultTextFont, .foregroundColor: defaultTextColor]),
            selected: NSAttributedString(string: text, attributes: [.font: selectedTextFont, .foregroundColor: selectedTextColor])
        )
    }

    open func changeThumbShadowColor(_ color: UIColor) {
        thumbShadowColor = color
    }

    open func changeThumbColor(_ color: UIColor) {
        thumbColor = color
        applyChrome()
    }

    open func changeBackgroundColor(_ color: UIColor) {
        containerBackgroundColor = color
        applyChrome()
    }

    open func changeThumbGradientColors(_ colors: [UIColor]) {
        thumbGradientColors = colors
        if let first = colors.first {
            changeThumbColor(first)
        }
    }
}
