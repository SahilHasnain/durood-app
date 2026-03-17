import { useEffect, useState } from "react";
import { Keyboard, LayoutAnimation, Platform, View } from "react-native";

interface KeyboardSpacerProps {
  topSpacing?: number;
}

export default function KeyboardSpacer({
  topSpacing = 0,
}: KeyboardSpacerProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);     

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {   
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height + topSpacing); 
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {    
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [topSpacing]);

  return <View style={{ height: keyboardHeight }} />;
}
